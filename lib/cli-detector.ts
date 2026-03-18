import { execFile } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
import { homedir, platform } from "os";

export interface CliCapabilities {
  canDispatch: boolean;
  cliVersion: string | null;
  cliPath: string | null;
}

const DEFAULT_RESULT: CliCapabilities = {
  canDispatch: false,
  cliVersion: null,
  cliPath: null,
};

// Persist across HMR in dev mode
const g = globalThis as typeof globalThis & { __cliCaps?: CliCapabilities; __cliDetecting?: Promise<CliCapabilities> | null };

function run(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 5000 }, (err, stdout) => {
      if (err) return reject(err);
      resolve(stdout.trim());
    });
  });
}

function findClaudePath(): string | null {
  const isWin = platform() === "win32";
  const home = homedir();

  // Common install locations
  const candidates = isWin
    ? [
        join(home, ".local", "bin", "claude.exe"),
        join(home, "AppData", "Local", "Programs", "claude", "claude.exe"),
        join(home, ".npm-global", "claude.cmd"),
      ]
    : [
        join(home, ".local", "bin", "claude"),
        "/usr/local/bin/claude",
        join(home, ".npm-global", "bin", "claude"),
      ];

  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

async function detect(): Promise<CliCapabilities> {
  // 1. Try running claude directly (if in PATH)
  try {
    const version = await run("claude", ["--version"]);
    return { canDispatch: true, cliVersion: version, cliPath: "claude" };
  } catch { /* not in PATH */ }

  // 2. Try which/where
  try {
    const whichCmd = platform() === "win32" ? "where" : "which";
    const cliPath = await run(whichCmd, ["claude"]);
    if (cliPath) {
      const firstLine = cliPath.split("\n")[0].trim();
      let version: string | null = null;
      try { version = await run(firstLine, ["--version"]); } catch { /* ok */ }
      return { canDispatch: true, cliVersion: version, cliPath: firstLine };
    }
  } catch { /* not found */ }

  // 3. Check common install paths
  const found = findClaudePath();
  if (found) {
    let version: string | null = null;
    try { version = await run(found, ["--version"]); } catch { /* ok */ }
    return { canDispatch: true, cliVersion: version, cliPath: found };
  }

  return DEFAULT_RESULT;
}

export async function detectCli(): Promise<CliCapabilities> {
  if (g.__cliCaps) return g.__cliCaps;

  if (!g.__cliDetecting) {
    g.__cliDetecting = detect().then((result) => {
      g.__cliCaps = result;
      g.__cliDetecting = null;
      return result;
    });
  }

  return g.__cliDetecting;
}

export function getCachedCapabilities(): CliCapabilities | null {
  return g.__cliCaps ?? null;
}

export function resetCliCache(): void {
  g.__cliCaps = undefined;
  g.__cliDetecting = null;
}
