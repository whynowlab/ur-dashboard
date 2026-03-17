import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import type {
  UsageRecord,
  TripoRecord,
  CommitEntry,
  TeamDefinition,
  PipelineEntry,
  TeamStatus,
} from "./types";

function expandHome(p: string): string {
  return p.replace(/^~/, process.env.HOME || "/Users/dd");
}

export function readJsonlFile<T>(filePath: string): T[] {
  const resolved = expandHome(filePath);
  if (!existsSync(resolved)) return [];
  const content = readFileSync(resolved, "utf-8").trim();
  if (!content) return [];
  return content.split("\n").map((line) => JSON.parse(line) as T);
}

export function readJsonFile<T>(filePath: string): T | null {
  const resolved = expandHome(filePath);
  if (!existsSync(resolved)) return null;
  return JSON.parse(readFileSync(resolved, "utf-8")) as T;
}

export function getActiveAgentPids(stateDir: string): string[] {
  const dir = expandHome(join(stateDir, "agents"));
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".pid"))
    .map((f) => f.replace(".pid", ""));
}

export function readTeamStatuses(
  teamsPath: string,
  statePath: string
): TeamStatus[] {
  const teamsData = readJsonFile<{ teams: Record<string, TeamDefinition> }>(
    teamsPath
  );
  const pipelineData = readJsonFile<Record<string, PipelineEntry>>(
    statePath + "/pipeline.json"
  );
  const activePids = getActiveAgentPids(statePath);

  if (!teamsData) return [];

  return Object.entries(teamsData.teams).map(([name, team]) => {
    const pipeline = pipelineData?.[name];
    const hasActivePid = activePids.some((pid) =>
      team.agents.some((a) => a.name === pid)
    );

    let status: "active" | "standby" | "interrupted" = "standby";
    if (pipeline?.status === "running" || hasActivePid) status = "active";
    else if (pipeline?.status === "interrupted") status = "interrupted";

    return {
      name,
      description: team.description,
      mode: team.mode,
      agentCount: team.agents.length,
      status,
      currentStep: pipeline?.step,
      totalSteps: pipeline?.total,
      currentAgent: pipeline?.current,
      lastUpdate: pipeline?.ts,
    };
  });
}

export function readCommits(
  timelinePath: string,
  limit = 20
): CommitEntry[] {
  const records = readJsonlFile<{
    ts: string;
    tool: string;
    cmd: string;
    exit: number;
  }>(timelinePath);
  return records
    .filter(
      (r) => r.tool === "Bash" && r.cmd.includes("git commit") && r.exit === 0
    )
    .map((r) => {
      const msgMatch = r.cmd.match(
        /commit -m ["']?(?:\$\(cat <<'?EOF'?\n)?(.+?)(?:\nEOF\n\))?["']?$/s
      );
      const projectMatch = r.cmd.match(
        /cd (?:~\/)?(?:Projects\/)?([^\s/&]+)/
      );
      return {
        ts: r.ts,
        message: msgMatch?.[1]?.slice(0, 80) || r.cmd.slice(0, 80),
        project: projectMatch?.[1] || "unknown",
      };
    })
    .reverse()
    .slice(0, limit);
}
