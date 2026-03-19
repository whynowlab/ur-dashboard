import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type {
  UsageRecord,
  TripoRecord,
  CommitEntry,
  TeamDefinition,
  PipelineEntry,
  TeamStatus,
  SkillUsageEntry,
} from "./types";

function expandHome(p: string): string {
  return p.replace(/^~/, homedir());
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
  try {
    return JSON.parse(readFileSync(resolved, "utf-8")) as T;
  } catch {
    return null;
  }
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

export function readSkillUsage(statePath: string): SkillUsageEntry[] {
  const map = new Map<string, { count: number; lastUsed: string }>();

  // Source 1: orchestrator skill-usage.jsonl (if exists)
  const records = readJsonlFile<{
    ts: string;
    skill: string;
    args: string;
    invoked_by: string;
  }>(`${statePath}/skill-usage.jsonl`);

  for (const r of records) {
    const existing = map.get(r.skill);
    if (!existing || r.ts > existing.lastUsed) {
      map.set(r.skill, {
        count: (existing?.count || 0) + 1,
        lastUsed: r.ts,
      });
    } else {
      existing.count += 1;
    }
  }

  // Source 2: Claude Code session logs — scan for Skill tool invocations
  const claudeHome = process.env.CLAUDE_HOME || join(homedir(), ".claude");
  const projectsDir = join(claudeHome, "projects");
  if (existsSync(projectsDir)) {
    try {
      const projectDirs = readdirSync(projectsDir);
      // Only scan recent session files (last 7 days) for performance
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;

      for (const projDir of projectDirs) {
        const projPath = join(projectsDir, projDir);
        try {
          if (!statSync(projPath).isDirectory()) continue;
          const files = readdirSync(projPath).filter((f) => f.endsWith(".jsonl"));
          for (const file of files) {
            const fp = join(projPath, file);
            try {
              const fstat = statSync(fp);
              if (fstat.mtime.getTime() < cutoff) continue;
              const content = readFileSync(fp, "utf-8");
              for (const line of content.split("\n")) {
                if (!line.includes('"name":"Skill"')) continue;
                try {
                  const entry = JSON.parse(line);
                  const ts = entry.timestamp || "";
                  const msgContent = entry.message?.content;
                  if (!Array.isArray(msgContent)) continue;
                  for (const c of msgContent) {
                    if (c.type === "tool_use" && c.name === "Skill" && c.input?.skill) {
                      const skill = c.input.skill;
                      const existing = map.get(skill);
                      if (!existing || ts > existing.lastUsed) {
                        map.set(skill, {
                          count: (existing?.count || 0) + 1,
                          lastUsed: ts,
                        });
                      } else {
                        existing.count += 1;
                      }
                    }
                  }
                } catch { /* skip malformed line */ }
              }
            } catch { /* skip file */ }
          }
        } catch { /* skip dir */ }
      }
    } catch { /* skip */ }
  }

  return Array.from(map.entries())
    .map(([skill, data]) => ({ skill, ...data }))
    .sort((a, b) => b.count - a.count);
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
        new RegExp('commit -m ["\']?(?:\\$\\(cat <<\'?EOF\'?\\n)?(.+?)(?:\\nEOF\\n\\))?["\']?$', 's')
      );
      const projectMatch = r.cmd.match(
        new RegExp('cd (?:~/)?(?:Projects/)?([^\\s/&]+)')
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
