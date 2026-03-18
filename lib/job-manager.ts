import { spawn, execFile, type ChildProcess } from "child_process";
import { join } from "path";
import { homedir } from "os";
import { existsSync } from "fs";

// ---------------------------------------------------------------------------
// Types (inline — will be moved to types.ts later)
// ---------------------------------------------------------------------------

export interface DispatchJobLog {
  type: "stdout" | "stderr" | "system";
  data: string;
  timestamp: string;
}

export interface DispatchJob {
  jobId: string;
  agent: string;
  prompt: string;
  status: "running" | "completed" | "failed" | "cancelled" | "timeout";
  startedAt: string;
  endedAt?: string;
  exitCode?: number;
  logs: DispatchJobLog[];
  process?: ChildProcess; // not serialized
}

export interface DispatchOptions {
  permissionMode?: string;
  timeout?: number;
  claudeHome?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MAX_CONCURRENT = 3;

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

// Persist across HMR in dev mode
const g = globalThis as typeof globalThis & { __dispatchJobs?: Map<string, DispatchJob> };
const jobs = g.__dispatchJobs ?? (g.__dispatchJobs = new Map<string, DispatchJob>());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getClaudeHome(override?: string): string {
  return override || process.env.CLAUDE_HOME || join(homedir(), ".claude");
}

function now(): string {
  return new Date().toISOString();
}

/** Strip the `process` handle so the object is safe to serialize. */
function sanitize(job: DispatchJob): Omit<DispatchJob, "process"> {
  const { process: _unused, ...rest } = job;
  void _unused;
  return rest;
}

function resolveAgentPath(claudeHome: string, agent: string): string | null {
  const agentsDir = join(claudeHome, "agents");

  // Direct path (e.g. "my-agent.md")
  const directMd = join(agentsDir, agent.endsWith(".md") ? agent : `${agent}.md`);
  if (existsSync(directMd)) return directMd;

  // JSON variant
  const directJson = join(agentsDir, agent.endsWith(".json") ? agent : `${agent}.json`);
  if (existsSync(directJson)) return directJson;

  // Subdirectory (e.g. "engineering/ai-engineer.md" passed as "engineering/ai-engineer")
  if (agent.includes("/")) {
    const mdPath = join(agentsDir, agent.endsWith(".md") ? agent : `${agent}.md`);
    if (existsSync(mdPath)) return mdPath;
  }

  return null;
}

function countRunning(): number {
  let count = 0;
  for (const job of jobs.values()) {
    if (job.status === "running") count++;
  }
  return count;
}

/** Forcefully kill a process — SIGTERM then SIGKILL after grace period. */
function killProcess(proc: ChildProcess, gracePeriodMs = 5000): void {
  if (!proc.pid) return;

  const isWindows = process.platform === "win32";

  if (isWindows) {
    // On Windows, taskkill /T kills the process tree
    try {
      execFile("taskkill", ["/pid", String(proc.pid), "/T", "/F"], { shell: false });
    } catch {
      // best effort
    }
    return;
  }

  // Unix: SIGTERM first
  try {
    proc.kill("SIGTERM");
  } catch {
    // already dead
    return;
  }

  // If still alive after grace period, SIGKILL
  const killTimer = setTimeout(() => {
    try {
      proc.kill("SIGKILL");
    } catch {
      // already dead
    }
  }, gracePeriodMs);

  // Don't keep Node alive just for this timer
  killTimer.unref();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function dispatchJob(
  agent: string,
  prompt: string,
  options: DispatchOptions = {},
): DispatchJob {
  const claudeHome = getClaudeHome(options.claudeHome);

  // Validate agent exists
  const agentPath = resolveAgentPath(claudeHome, agent);
  if (!agentPath) {
    throw new Error(`Agent not found: "${agent}" (looked in ${join(claudeHome, "agents")})`);
  }

  // Check concurrency limit
  if (countRunning() >= MAX_CONCURRENT) {
    throw new Error(
      `Concurrent job limit reached (${MAX_CONCURRENT}). Cancel or wait for a running job to finish.`,
    );
  }

  const jobId = crypto.randomUUID();
  const timeoutMs = options.timeout ?? DEFAULT_TIMEOUT_MS;

  // Build args
  const args = ["-p", "--agent", agent, "--output-format", "text", prompt];
  if (options.permissionMode) {
    args.push("--permission-mode", options.permissionMode);
  }

  // Spawn
  // Use detected CLI path, fallback to "claude" in PATH
  const { getCachedCapabilities } = require("./cli-detector") as { getCachedCapabilities: () => { cliPath?: string | null } | null };
  const cliPath = getCachedCapabilities()?.cliPath || "claude";

  const child = spawn(cliPath, args, {
    shell: false,
    env: { ...process.env, CLAUDE_HOME: claudeHome },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const job: DispatchJob = {
    jobId,
    agent,
    prompt,
    status: "running",
    startedAt: now(),
    logs: [],
    process: child,
  };

  // System log: started
  job.logs.push({ type: "system", data: `Job ${jobId} started (agent=${agent})`, timestamp: now() });

  // Capture stdout
  child.stdout?.on("data", (chunk: Buffer) => {
    job.logs.push({ type: "stdout", data: chunk.toString(), timestamp: now() });
  });

  // Capture stderr
  child.stderr?.on("data", (chunk: Buffer) => {
    job.logs.push({ type: "stderr", data: chunk.toString(), timestamp: now() });
  });

  // Handle exit
  child.on("close", (code, signal) => {
    // If already marked (cancelled/timeout), don't overwrite
    if (job.status === "running") {
      job.status = code === 0 ? "completed" : "failed";
    }
    job.exitCode = code ?? undefined;
    job.endedAt = now();
    job.process = undefined;

    job.logs.push({
      type: "system",
      data: `Process exited: code=${code} signal=${signal}`,
      timestamp: now(),
    });

    // Clear timeout timer if still pending
    if (timeoutTimer) clearTimeout(timeoutTimer);
  });

  // Handle spawn errors (e.g. claude binary not found)
  child.on("error", (err) => {
    if (job.status === "running") {
      job.status = "failed";
    }
    job.endedAt = now();
    job.process = undefined;

    job.logs.push({
      type: "system",
      data: `Spawn error: ${err.message}`,
      timestamp: now(),
    });

    if (timeoutTimer) clearTimeout(timeoutTimer);
  });

  // Timeout
  const timeoutTimer = setTimeout(() => {
    if (job.status !== "running") return;
    job.status = "timeout";
    job.logs.push({
      type: "system",
      data: `Job timed out after ${timeoutMs}ms — sending SIGTERM`,
      timestamp: now(),
    });
    if (job.process) {
      killProcess(job.process);
    }
  }, timeoutMs);
  timeoutTimer.unref();

  jobs.set(jobId, job);
  return sanitize(job) as DispatchJob;
}

export function cancelJob(jobId: string): Omit<DispatchJob, "process"> {
  const job = jobs.get(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }
  if (job.status !== "running") {
    throw new Error(`Job ${jobId} is not running (status=${job.status})`);
  }

  job.status = "cancelled";
  job.logs.push({ type: "system", data: "Cancel requested — sending SIGTERM", timestamp: now() });

  if (job.process) {
    killProcess(job.process);
  }

  return sanitize(job);
}

export function getJob(jobId: string): Omit<DispatchJob, "process"> | null {
  const job = jobs.get(jobId);
  if (!job) return null;
  return sanitize(job);
}

export function getAllJobs(): Array<Omit<DispatchJob, "process">> {
  return Array.from(jobs.values()).map(sanitize);
}

export function getJobLogs(jobId: string, since?: number): DispatchJobLog[] {
  const job = jobs.get(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }
  const startIndex = since ?? 0;
  return job.logs.slice(startIndex);
}

// ---------------------------------------------------------------------------
// Cleanup on process exit — kill all running children
// ---------------------------------------------------------------------------

function cleanupAll(): void {
  for (const job of jobs.values()) {
    if (job.status === "running" && job.process) {
      try {
        job.process.kill("SIGKILL");
      } catch {
        // best effort
      }
    }
  }
}

process.on("exit", cleanupAll);
process.on("SIGINT", () => {
  cleanupAll();
  process.exit(130);
});
process.on("SIGTERM", () => {
  cleanupAll();
  process.exit(143);
});
