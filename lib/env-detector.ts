import { existsSync, statSync, readdirSync } from "fs";
import { join, basename, extname } from "path";
import { homedir } from "os";

export interface FileInfo {
  path: string;
  name: string;
  exists: boolean;
  mtime: string | null;
  size?: number;
  type: "file" | "dir";
  category: string;
}

export interface ScannedEnvironment {
  claudeHome: string;
  setupLevel: "full" | "minimal" | "none";
  directories: FileInfo[];
  configFiles: FileInfo[];
  dataFiles: FileInfo[];
  runtime: {
    nodeVersion: string;
    dashboardVersion: string;
    platform: string;
  };
}

// Category mapping — known Claude Code directories and their purpose
const DIR_CATEGORIES: Record<string, string> = {
  agents: "Agents",
  skills: "Skills",
  commands: "Commands",
  plugins: "Plugins",
  hooks: "Hooks",
  "mcp-servers": "MCP Servers",
  sessions: "Sessions",
  projects: "Projects",
  rules: "Rules",
  todos: "Tasks",
  plans: "Plans",
  ide: "IDE",
  cache: "Cache",
  backups: "Backups",
  debug: "Debug",
  telemetry: "Telemetry",
  "file-history": "File History",
  "paste-cache": "Paste Cache",
  "shell-snapshots": "Shell Snapshots",
  "session-env": "Session Env",
  chrome: "Chrome",
  downloads: "Downloads",
  statsig: "Statsig",
  // Orchestrator-specific (DD's setup)
  orchestrator: "Orchestrator",
  jarvis: "Jarvis AI",
};

const CONFIG_EXTENSIONS = new Set([".json", ".jsonl", ".yaml", ".yml", ".toml"]);
const IGNORED_DIRS = new Set(["cache", "backups", "debug", "telemetry", "statsig", "paste-cache", "shell-snapshots", "session-env", "chrome", "downloads"]);

function getClaudeHome(): string {
  return process.env.CLAUDE_HOME || join(homedir(), ".claude");
}

function safestat(p: string): { mtime: string; size: number } | null {
  try {
    const s = statSync(p);
    return { mtime: s.mtime.toISOString(), size: s.size };
  } catch {
    return null;
  }
}

function countItems(dirPath: string): number {
  try {
    return readdirSync(dirPath).length;
  } catch {
    return 0;
  }
}

function latestMtimeInDir(dirPath: string): string | null {
  try {
    const files = readdirSync(dirPath);
    let latest = 0;
    for (const f of files) {
      try {
        const s = statSync(join(dirPath, f));
        if (s.mtime.getTime() > latest) latest = s.mtime.getTime();
      } catch { /* skip */ }
    }
    return latest > 0 ? new Date(latest).toISOString() : null;
  } catch {
    return null;
  }
}

let cachedResult: ScannedEnvironment | null = null;

export function scanEnvironment(): ScannedEnvironment {
  if (cachedResult) return cachedResult;

  const claudeHome = getClaudeHome();

  if (!existsSync(claudeHome)) {
    cachedResult = {
      claudeHome,
      setupLevel: "none",
      directories: [],
      configFiles: [],
      dataFiles: [],
      runtime: {
        nodeVersion: process.version,
        dashboardVersion: process.env.npm_package_version || "0.1.0",
        platform: process.platform,
      },
    };
    return cachedResult;
  }

  const directories: FileInfo[] = [];
  const configFiles: FileInfo[] = [];
  const dataFiles: FileInfo[] = [];

  // Scan top-level entries
  let entries: string[] = [];
  try {
    entries = readdirSync(claudeHome);
  } catch {
    entries = [];
  }

  for (const entry of entries) {
    const fullPath = join(claudeHome, entry);
    const stat = safestat(fullPath);
    if (!stat) continue;

    const isDir = (() => {
      try { return statSync(fullPath).isDirectory(); } catch { return false; }
    })();

    if (isDir) {
      const category = DIR_CATEGORIES[entry] || entry;
      const itemCount = countItems(fullPath);
      const latestMod = latestMtimeInDir(fullPath);

      directories.push({
        path: fullPath,
        name: entry,
        exists: true,
        mtime: latestMod,
        size: itemCount,
        type: "dir",
        category,
      });

      // Scan for notable files inside non-ignored directories
      if (!IGNORED_DIRS.has(entry)) {
        try {
          const subEntries = readdirSync(fullPath);
          for (const sub of subEntries.slice(0, 50)) {
            const subPath = join(fullPath, sub);
            const subStat = safestat(subPath);
            if (!subStat) continue;
            const ext = extname(sub);
            try {
              if (!statSync(subPath).isDirectory() && CONFIG_EXTENSIONS.has(ext)) {
                dataFiles.push({
                  path: subPath,
                  name: `${entry}/${sub}`,
                  exists: true,
                  mtime: subStat.mtime,
                  size: subStat.size,
                  type: "file",
                  category,
                });
              }
            } catch { /* skip */ }
          }
        } catch { /* skip */ }
      }
    } else {
      // Top-level file
      const ext = extname(entry);
      const info: FileInfo = {
        path: fullPath,
        name: entry,
        exists: true,
        mtime: stat.mtime,
        size: stat.size,
        type: "file",
        category: "Config",
      };

      if (CONFIG_EXTENSIONS.has(ext)) {
        configFiles.push(info);
      } else {
        dataFiles.push(info);
      }
    }
  }

  // Also check CLAUDE.md in home dir
  const claudeMdPath = join(homedir(), "CLAUDE.md");
  const claudeMdStat = safestat(claudeMdPath);
  if (claudeMdStat) {
    configFiles.push({
      path: claudeMdPath,
      name: "~/CLAUDE.md",
      exists: true,
      mtime: claudeMdStat.mtime,
      size: claudeMdStat.size,
      type: "file",
      category: "Config",
    });
  }

  // Determine setup level
  const dirNames = new Set(directories.map((d) => d.name));
  let setupLevel: "full" | "minimal" | "none" = "minimal";
  if (dirNames.has("orchestrator") || dirNames.has("jarvis")) {
    setupLevel = "full";
  }

  // Sort directories: non-ignored first, by category
  directories.sort((a, b) => {
    const aIgnored = IGNORED_DIRS.has(a.name) ? 1 : 0;
    const bIgnored = IGNORED_DIRS.has(b.name) ? 1 : 0;
    if (aIgnored !== bIgnored) return aIgnored - bIgnored;
    return a.category.localeCompare(b.category);
  });

  cachedResult = {
    claudeHome,
    setupLevel,
    directories,
    configFiles,
    dataFiles,
    runtime: {
      nodeVersion: process.version,
      dashboardVersion: process.env.npm_package_version || "0.1.0",
      platform: process.platform,
    },
  };

  return cachedResult;
}

export function resetCache(): void {
  cachedResult = null;
}

// Backward-compatible: still needed by stream route for orchestrator data
export function getOrchestratorPaths(configOverrides?: {
  data_path?: string;
  teams_path?: string;
}): { statePath: string | null; teamsPath: string | null } {
  const claudeHome = getClaudeHome();
  const orchState = join(claudeHome, "orchestrator", "state");
  const orchTeams = join(claudeHome, "orchestrator", "agents", "teams.json");

  if (existsSync(orchState) && existsSync(orchTeams)) {
    return { statePath: orchState, teamsPath: orchTeams };
  }

  // Fallback to config overrides
  if (configOverrides?.data_path) {
    const p = configOverrides.data_path.replace(/^~/, homedir());
    if (existsSync(p)) {
      const t = configOverrides.teams_path?.replace(/^~/, homedir()) || "";
      return { statePath: p, teamsPath: existsSync(t) ? t : null };
    }
  }

  return { statePath: null, teamsPath: null };
}
