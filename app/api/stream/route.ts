import { readJsonlFile, readTeamStatuses, readCommits, readSkillUsage } from "@/lib/data-reader";
import { calculateUsageCosts } from "@/lib/pricing";
import { getOrchestratorPaths, scanEnvironment } from "@/lib/env-detector";
import { scanAgents } from "@/lib/agent-scanner";
import { detectCli, getCachedCapabilities } from "@/lib/cli-detector";
import type { UsageRecord, TripoRecord, DashboardData, ComponentStat, RecentFile } from "@/lib/types";
import { readdirSync, statSync } from "fs";
import { join } from "path";
import config from "@/dashboard.config.json";

// Kick off CLI detection at module load
detectCli();

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const IGNORED_DIRS = new Set(["cache", "backups", "debug", "telemetry", "statsig", "paste-cache", "shell-snapshots", "session-env", "chrome", "downloads"]);

function getRecentFiles(claudeHome: string, limit = 15): RecentFile[] {
  const files: RecentFile[] = [];

  try {
    const dirs = readdirSync(claudeHome);
    for (const dir of dirs) {
      if (IGNORED_DIRS.has(dir)) continue;
      const dirPath = join(claudeHome, dir);
      try {
        const s = statSync(dirPath);
        if (!s.isDirectory()) continue;
        const entries = readdirSync(dirPath);
        for (const entry of entries) {
          const fp = join(dirPath, entry);
          try {
            const fs = statSync(fp);
            if (fs.isDirectory()) continue;
            files.push({
              name: entry,
              path: `${dir}/${entry}`,
              category: dir,
              mtime: fs.mtime.toISOString(),
              size: fs.size,
            });
          } catch { /* skip */ }
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }

  return files
    .sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime())
    .slice(0, limit);
}

function collectData(): DashboardData {
  const orch = getOrchestratorPaths({
    data_path: config.data_path,
    teams_path: config.teams_path,
  });
  const env = scanEnvironment();

  const basePath = orch.statePath || "";
  const teamsPath = orch.teamsPath || "";

  // Orchestrator data
  const openai = basePath ? readJsonlFile<UsageRecord>(`${basePath}/openai-usage.jsonl`) : [];
  const gemini = basePath ? readJsonlFile<UsageRecord>(`${basePath}/gemini-usage.jsonl`) : [];
  const tripo = basePath ? readJsonlFile<TripoRecord>(`${basePath}/tripo3d-usage.jsonl`) : [];
  const { costs, total } = calculateUsageCosts(openai, gemini, tripo);

  let teams = teamsPath && basePath ? readTeamStatuses(teamsPath, basePath) : [];
  // Fallback: scan ~/.claude/agents/ if no orchestrator teams
  if (teams.length === 0) {
    teams = scanAgents();
  }
  const commits = basePath ? readCommits(`${basePath}/timeline.jsonl`) : [];
  const skills = basePath ? readSkillUsage(basePath) : [];

  // Scan-based data
  const components: ComponentStat[] = env.directories
    .filter((d) => !IGNORED_DIRS.has(d.name))
    .map((d) => ({
      name: d.name,
      category: d.category,
      count: d.size || 0,
      lastModified: d.mtime,
    }));

  const recentFiles = getRecentFiles(env.claudeHome);

  let activePanels = 0;
  if (costs.length > 0) activePanels++;
  if (teams.length > 0) activePanels++;
  if (commits.length > 0) activePanels++;
  if (skills.length > 0) activePanels++;

  return {
    usage: costs,
    totalCost: total,
    teams,
    commits,
    skills,
    components,
    recentFiles,
    environment: {
      setupLevel: env.setupLevel,
      hasOrchestrator: !!orch.statePath,
      hasSkillRouter: env.directories.some((d) => d.name === "skills"),
      activePanels,
    },
    capabilities: getCachedCapabilities() || { canDispatch: false, cliVersion: null },
    updatedAt: new Date().toISOString(),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const interval = config.refresh_interval || 5000;

  const stream = new ReadableStream({
    async start(controller) {
      const send = () => {
        try {
          const data = collectData();
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        } catch (e) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: String(e) })}\n\n`)
          );
        }
      };

      if (request.signal.aborted) {
        controller.close();
        return;
      }

      request.signal.addEventListener("abort", () => {
        controller.close();
      });

      while (!request.signal.aborted) {
        send();
        await sleep(interval);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
