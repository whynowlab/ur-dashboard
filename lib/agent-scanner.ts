import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join, extname } from "path";
import { homedir } from "os";
import type { TeamStatus, TeamConfig } from "./types";

function getClaudeHome(): string {
  return process.env.CLAUDE_HOME || join(homedir(), ".claude");
}

interface AgentMeta {
  name: string;
  filename: string; // basename without extension — used for prefix grouping
  description: string;
  mtime: string;
}

function parseAgentFrontmatter(content: string): { name?: string; description?: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const block = match[1];
  const name = block.match(/^name:\s*(.+)$/m)?.[1]?.trim();
  const desc = block.match(/^description:\s*>?\s*\n?([\s\S]*?)(?=\n\w|\n---)/m)?.[1]?.trim()
    || block.match(/^description:\s*(.+)$/m)?.[1]?.trim();

  return { name, description: desc };
}

function readAgentFiles(dir: string): AgentMeta[] {
  const agents: AgentMeta[] = [];
  try {
    const files = readdirSync(dir);
    for (const file of files) {
      const fp = join(dir, file);
      try {
        const s = statSync(fp);
        if (s.isDirectory()) continue;
        const ext = extname(file);
        if (ext === ".md") {
          const content = readFileSync(fp, "utf-8");
          const meta = parseAgentFrontmatter(content);
          const basename = file.replace(".md", "");
          agents.push({
            name: meta.name || basename,
            filename: basename,
            description: meta.description || "",
            mtime: s.mtime.toISOString(),
          });
        } else if (ext === ".json") {
          try {
            const data = JSON.parse(readFileSync(fp, "utf-8"));
            const basename = file.replace(".json", "");
            agents.push({
              name: data.name || basename,
              filename: basename,
              description: data.description || "",
              mtime: s.mtime.toISOString(),
            });
          } catch { /* skip invalid json */ }
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
  return agents;
}

export function readTeamsConfig(): TeamConfig | null {
  const teamsJsonPath = join(getClaudeHome(), "agents", "teams.json");
  if (!existsSync(teamsJsonPath)) return null;
  try {
    const raw = readFileSync(teamsJsonPath, "utf-8");
    return JSON.parse(raw) as TeamConfig;
  } catch {
    return null;
  }
}

export function getAllAgentFilenames(): string[] {
  const claudeHome = getClaudeHome();
  const agents = new Set<string>();

  // Scan ~/.claude/agents/
  const agentsDir = join(claudeHome, "agents");
  if (existsSync(agentsDir)) {
    try {
      for (const entry of readdirSync(agentsDir)) {
        const fp = join(agentsDir, entry);
        try {
          const s = statSync(fp);
          if (s.isDirectory()) {
            for (const sub of readAgentFiles(fp)) agents.add(sub.filename);
          } else {
            const ext = extname(entry);
            if (ext === ".md") agents.add(entry.replace(".md", ""));
            else if (ext === ".json" && entry !== "teams.json") agents.add(entry.replace(".json", ""));
          }
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }

  // Scan ~/.claude/orchestrator/agents/ (if orchestrator exists)
  const orchAgentsDir = join(claudeHome, "orchestrator", "agents");
  if (existsSync(orchAgentsDir)) {
    try {
      for (const entry of readdirSync(orchAgentsDir)) {
        const fp = join(orchAgentsDir, entry);
        try {
          const s = statSync(fp);
          if (!s.isDirectory()) {
            const ext = extname(entry);
            if (ext === ".md") agents.add(entry.replace(".md", ""));
          }
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }

  return Array.from(agents).sort();
}

export function getAutoDetectedTeams(): Record<string, { description: string; agents: string[] }> {
  const claudeHome = getClaudeHome();
  const agentsDir = join(claudeHome, "agents");
  const result: Record<string, { description: string; agents: string[] }> = {};

  if (!existsSync(agentsDir)) return result;

  try {
    const entries = readdirSync(agentsDir);
    const flatAgents: AgentMeta[] = [];

    for (const entry of entries) {
      const fp = join(agentsDir, entry);
      try {
        const s = statSync(fp);
        if (s.isDirectory()) {
          const members = readAgentFiles(fp);
          if (members.length > 0) {
            result[entry] = {
              description: members.map((a) => a.name).join(", "),
              agents: members.map((a) => a.filename),
            };
          }
          continue;
        }
        const ext = extname(entry);
        if (ext === ".md") {
          const content = readFileSync(fp, "utf-8");
          const meta = parseAgentFrontmatter(content);
          const basename = entry.replace(".md", "");
          flatAgents.push({
            name: meta.name || basename,
            filename: basename,
            description: meta.description || "",
            mtime: s.mtime.toISOString(),
          });
        } else if (ext === ".json" && entry !== "teams.json") {
          try {
            const data = JSON.parse(readFileSync(fp, "utf-8"));
            const basename = entry.replace(".json", "");
            flatAgents.push({
              name: data.name || basename,
              filename: basename,
              description: data.description || "",
              mtime: s.mtime.toISOString(),
            });
          } catch { /* skip */ }
        }
      } catch { /* skip */ }
    }

    // Group flat agents by prefix
    const prefixMap = new Map<string, AgentMeta[]>();
    for (const a of flatAgents) {
      const prefix = a.filename.includes("-") ? a.filename.split("-")[0] : a.filename;
      const group = prefixMap.get(prefix) || [];
      group.push(a);
      prefixMap.set(prefix, group);
    }

    for (const [prefix, members] of prefixMap) {
      result[prefix] = {
        description: `${members.length} agents`,
        agents: members.map((a) => a.filename),
      };
    }
  } catch { /* skip */ }

  return result;
}

function buildTeamsFromConfig(config: TeamConfig): TeamStatus[] {
  return Object.entries(config.teams).map(([name, team]) => ({
    name,
    description: team.description,
    mode: team.agents.length > 1 ? "team" : "agent",
    agentCount: team.agents.length,
    status: "standby" as const,
  }));
}

export function scanAgents(): TeamStatus[] {
  // Check for teams.json first
  const teamsConfig = readTeamsConfig();
  if (teamsConfig) {
    return buildTeamsFromConfig(teamsConfig);
  }

  const claudeHome = getClaudeHome();
  const agentsDir = join(claudeHome, "agents");

  if (!existsSync(agentsDir)) return [];

  const results: TeamStatus[] = [];

  try {
    const entries = readdirSync(agentsDir);
    const subdirs: string[] = [];
    const flatAgents: AgentMeta[] = [];

    for (const entry of entries) {
      const fp = join(agentsDir, entry);
      try {
        const s = statSync(fp);
        if (s.isDirectory()) {
          subdirs.push(entry);
        } else {
          const ext = extname(entry);
          if (ext === ".md") {
            const content = readFileSync(fp, "utf-8");
            const meta = parseAgentFrontmatter(content);
            const basename = entry.replace(".md", "");
            flatAgents.push({
              name: meta.name || basename,
              filename: basename,
              description: meta.description || "",
              mtime: s.mtime.toISOString(),
            });
          } else if (ext === ".json") {
            try {
              const data = JSON.parse(readFileSync(fp, "utf-8"));
              const basename = entry.replace(".json", "");
              flatAgents.push({
                name: data.name || basename,
                filename: basename,
                description: data.description || "",
                mtime: s.mtime.toISOString(),
              });
            } catch { /* skip */ }
          }
        }
      } catch { /* skip */ }
    }

    // Subdirectories → each becomes a team entry
    for (const subdir of subdirs) {
      const subdirPath = join(agentsDir, subdir);
      const members = readAgentFiles(subdirPath);
      if (members.length === 0) continue;
      const latestMtime = members.reduce((max, a) => (a.mtime > max ? a.mtime : max), members[0].mtime);
      results.push({
        name: subdir,
        description: members.map((a) => a.name).join(", "),
        mode: "team",
        agentCount: members.length,
        status: "standby",
        lastUpdate: latestMtime,
      });
    }

    // Flat agent files → group by filename prefix (e.g. "engineering-ai-engineer" → "engineering")
    const prefixMap = new Map<string, AgentMeta[]>();
    for (const a of flatAgents) {
      const prefix = a.filename.includes("-") ? a.filename.split("-")[0] : a.filename;
      const group = prefixMap.get(prefix) || [];
      group.push(a);
      prefixMap.set(prefix, group);
    }

    for (const [prefix, members] of prefixMap) {
      const latestMtime = members.reduce((max, a) => (a.mtime > max ? a.mtime : max), members[0].mtime);
      if (members.length > 1) {
        results.push({
          name: prefix,
          description: `${members.length} agents`,
          mode: "team",
          agentCount: members.length,
          status: "standby",
          lastUpdate: latestMtime,
        });
      } else {
        results.push({
          name: members[0].name,
          description: members[0].description,
          mode: "agent",
          agentCount: 1,
          status: "standby",
          lastUpdate: latestMtime,
        });
      }
    }
  } catch { /* skip */ }

  return results;
}
