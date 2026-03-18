"use client";

import { useEffect, useState, useCallback } from "react";
import { GlassCard } from "@/components/ui/GlassCard";

/* ── Team Configuration types ── */
interface TeamEntry {
  description: string;
  agents: string[];
}

type TeamsMap = Record<string, TeamEntry>;

interface TeamsApiResponse {
  teams: TeamsMap;
  source: "file" | "auto";
  allAgents?: string[];
  error?: string;
}

function TeamConfigSection() {
  const [teams, setTeams] = useState<TeamsMap>({});
  const [allAgents, setAllAgents] = useState<string[]>([]);
  const [source, setSource] = useState<"file" | "auto">("auto");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [editingName, setEditingName] = useState<Record<string, string>>({});
  const [newTeamName, setNewTeamName] = useState("");
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(true);

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teams-config");
      if (!res.ok) throw new Error("fetch failed");
      const data: TeamsApiResponse = await res.json();
      if (data.error) throw new Error(data.error);
      setTeams(data.teams);
      setSource(data.source);
      // Use allAgents from API (full disk scan) if available, fallback to team members
      if (data.allAgents && data.allAgents.length > 0) {
        setAllAgents(Array.from(new Set(data.allAgents)).sort());
      } else {
        const agents = new Set<string>();
        for (const team of Object.values(data.teams)) {
          for (const a of team.agents) agents.add(a);
        }
        setAllAgents(Array.from(agents).sort());
      }
    } catch {
      setFeedback({ type: "error", msg: "Failed to load teams" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  // Agents currently assigned to any team
  const assignedAgents = new Set(Object.values(teams).flatMap((t) => t.agents));
  // Unassigned agents
  const unassignedAgents = allAgents.filter((a) => !assignedAgents.has(a));

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/teams-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teams }),
      });
      if (!res.ok) throw new Error("save failed");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSource("file");
      setFeedback({ type: "success", msg: "Configuration saved" });
    } catch (e) {
      setFeedback({ type: "error", msg: `Save failed: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setSaving(false);
    }
  };

  const handleRescan = async () => {
    // Delete saved config to force re-detection
    try {
      await fetch("/api/teams-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _rescan: true }),
      });
    } catch { /* ignore */ }
    fetchTeams();
  };

  const renameTeam = (oldKey: string, newName: string) => {
    if (!newName.trim() || newName === oldKey) {
      setEditingName((prev) => {
        const next = { ...prev };
        delete next[oldKey];
        return next;
      });
      return;
    }
    setTeams((prev) => {
      const next: TeamsMap = {};
      for (const [k, v] of Object.entries(prev)) {
        next[k === oldKey ? newName.trim() : k] = v;
      }
      return next;
    });
    setEditingName((prev) => {
      const next = { ...prev };
      delete next[oldKey];
      return next;
    });
  };

  const removeAgent = (teamKey: string, agentName: string) => {
    setTeams((prev) => {
      const team = prev[teamKey];
      if (!team) return prev;
      const agents = team.agents.filter((a) => a !== agentName);
      if (agents.length === 0) {
        const { [teamKey]: _removed, ...rest } = prev;
        void _removed;
        return rest;
      }
      return { ...prev, [teamKey]: { ...team, agents } };
    });
  };

  const removeTeam = (teamKey: string) => {
    setTeams((prev) => {
      const { [teamKey]: _removed, ...rest } = prev;
      void _removed;
      return rest;
    });
  };

  const addAgentToTeam = (teamKey: string, agentName: string) => {
    setTeams((prev) => {
      const team = prev[teamKey];
      if (!team || team.agents.includes(agentName)) return prev;
      return { ...prev, [teamKey]: { ...team, agents: [...team.agents, agentName] } };
    });
    setAddingTo(null);
  };

  const createTeam = () => {
    const name = newTeamName.trim();
    if (!name || teams[name]) return;
    setTeams((prev) => ({ ...prev, [name]: { description: "", agents: [] } }));
    setNewTeamName("");
  };

  const teamEntries = Object.entries(teams);

  return (
    <GlassCard>
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setCollapsed((p) => !p)}
      >
        <div className="flex items-center gap-2">
          <span className={`text-xs text-gray-400 transition-transform ${collapsed ? "" : "rotate-90"}`}>&#9654;</span>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Team Configuration
          </h3>
          <span
            className={`text-xs px-2 py-0.5 rounded-full border ${
              source === "auto"
                ? "bg-amber-50 border-amber-200 text-amber-600"
                : "bg-emerald-50 border-emerald-200 text-emerald-600"
            }`}
          >
            {source === "auto" ? "Auto-detected" : "Custom"}
          </span>
          {collapsed && <span className="text-xs text-gray-400">{teamEntries.length} teams</span>}
        </div>
        {!collapsed && (
          <button
            onClick={(e) => { e.stopPropagation(); handleRescan(); }}
            disabled={loading}
            className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
          >
            Re-scan
          </button>
        )}
      </div>

      {collapsed ? null : <div className="mt-3">

      {source === "auto" && teamEntries.length > 0 && (
        <div className="text-xs text-amber-600 bg-amber-50/60 border border-amber-200/60 rounded-lg px-3 py-2 mb-3">
          Auto-detected from agent filenames. Edit teams below and Save to customize. Agent files are never deleted.
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400 italic py-4 text-center">Loading teams...</p>
      ) : teamEntries.length === 0 ? (
        <p className="text-sm text-gray-400 italic py-4 text-center">No teams detected</p>
      ) : (
        <div className="space-y-2">
          {teamEntries.map(([key, team]) => (
            <div
              key={key}
              className="rounded-xl bg-white/30 border border-white/40 px-3 py-2.5"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {editingName[key] !== undefined ? (
                    <input
                      autoFocus
                      className="text-sm font-medium text-gray-800 bg-white/60 border border-gray-200 rounded px-1.5 py-0.5 w-40 outline-none focus:border-blue-300"
                      value={editingName[key]}
                      onChange={(e) =>
                        setEditingName((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      onBlur={() => renameTeam(key, editingName[key])}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") renameTeam(key, editingName[key]);
                        if (e.key === "Escape") {
                          setEditingName((prev) => {
                            const next = { ...prev };
                            delete next[key];
                            return next;
                          });
                        }
                      }}
                    />
                  ) : (
                    <span
                      className="text-sm font-medium text-gray-800 cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={() => setEditingName((prev) => ({ ...prev, [key]: key }))}
                      title="Click to rename"
                    >
                      {key}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {team.agents.length} agent{team.agents.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {addingTo === key ? (
                    <select
                      autoFocus
                      className="text-xs bg-white/60 border border-gray-200 rounded px-1 py-0.5 outline-none"
                      value=""
                      onChange={(e) => { if (e.target.value) addAgentToTeam(key, e.target.value); }}
                      onBlur={() => setTimeout(() => setAddingTo(null), 150)}
                    >
                      <option value="">Select agent...</option>
                      {allAgents.filter((a) => !team.agents.includes(a)).map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  ) : (
                    <button
                      onClick={() => setAddingTo(key)}
                      className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
                      title="Add agent to this team"
                    >
                      + Add
                    </button>
                  )}
                  <button
                    onClick={() => removeTeam(key)}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                    title="Hide team from dashboard (agent files are not deleted)"
                  >
                    Hide
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {team.agents.map((agent) => (
                  <span
                    key={agent}
                    className="inline-flex items-center gap-1 text-xs bg-white/50 border border-white/60 text-gray-600 rounded-full px-2 py-0.5"
                  >
                    {agent}
                    <button
                      onClick={() => removeAgent(key, agent)}
                      className="text-gray-400 hover:text-red-500 transition-colors leading-none"
                      title={`Remove ${agent} from this team`}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Unassigned agents pool */}
      {!loading && unassignedAgents.length > 0 && (
        <div className="mt-3 pt-2 border-t border-white/30">
          <p className="text-xs text-gray-400 mb-1.5">Unassigned agents ({unassignedAgents.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {unassignedAgents.map((a) => (
              <span key={a} className="text-xs bg-gray-100/50 text-gray-500 rounded-full px-2 py-0.5">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* New team */}
      {!loading && (
        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/30">
          <input
            className="text-xs bg-white/50 border border-gray-200 rounded-lg px-2 py-1 flex-1 outline-none focus:border-blue-300"
            placeholder="New team name..."
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") createTeam(); }}
          />
          <button
            onClick={createTeam}
            disabled={!newTeamName.trim()}
            className="text-xs px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors disabled:opacity-30"
          >
            + Team
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/40">
        <div className="text-xs min-h-[1.25rem]">
          {feedback && (
            <span className={feedback.type === "success" ? "text-emerald-600" : "text-red-500"}>
              {feedback.msg}
            </span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/80 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Configuration"}
        </button>
      </div>
      </div>}
    </GlassCard>
  );
}

/* ── Environment types ── */
interface FileInfo {
  path: string;
  name: string;
  exists: boolean;
  mtime: string | null;
  size?: number;
  type: "file" | "dir";
  category: string;
}

interface ScannedEnvironment {
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

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatSize(bytes?: number, isDir?: boolean): string {
  if (bytes === undefined || bytes === null) return "";
  if (isDir) return `${bytes} items`;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function DirCard({ dir }: { dir: FileInfo }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-white/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-lg">
          {dir.category === "Skills" ? "\u2666" :
           dir.category === "Commands" ? "\u25B6" :
           dir.category === "Plugins" ? "\u2756" :
           dir.category === "MCP Servers" ? "\u26A1" :
           dir.category === "Hooks" ? "\u2699" :
           dir.category === "Sessions" ? "\u25C9" :
           dir.category === "Projects" ? "\u25A3" :
           dir.category === "Rules" ? "\u25C8" :
           dir.category === "Orchestrator" ? "\u2726" :
           dir.category === "Jarvis AI" ? "\u2605" :
           dir.category === "Agents" ? "\u25C6" :
           dir.category === "Tasks" ? "\u2611" :
           dir.category === "Plans" ? "\u25A1" :
           "\u25CB"}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800">{dir.category}</p>
          <p className="text-xs text-gray-400 truncate">{dir.name}/</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-3">
        <span className="text-xs text-gray-400">{formatSize(dir.size, true)}</span>
        <span className="text-xs text-gray-500">{timeAgo(dir.mtime)}</span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
      </div>
    </div>
  );
}

function FileRow({ file }: { file: FileInfo }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/30 transition-colors">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
        <p className="text-xs text-gray-400 truncate">{file.path}</p>
      </div>
      <div className="flex items-center gap-3 ml-3 shrink-0">
        <span className="text-xs text-gray-400">{formatSize(file.size)}</span>
        <span className="text-xs text-gray-500">{timeAgo(file.mtime)}</span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
      </div>
    </div>
  );
}

export function SettingsView() {
  const [data, setData] = useState<ScannedEnvironment | null>(null);
  const [loading, setLoading] = useState(true);
  const [componentsOpen, setComponentsOpen] = useState(true);
  const [componentsShowAll, setComponentsShowAll] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [runtimeOpen, setRuntimeOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/environment");
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Scanning environment...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Failed to scan environment
      </div>
    );
  }

  const visibleDirs = data.directories.filter(
    (d) => !["Cache", "Backups", "Debug", "Telemetry", "Statsig", "Paste Cache", "Shell Snapshots", "Session Env", "Chrome", "Downloads"].includes(d.category)
  );

  return (
    <div className="space-y-4">
      {/* Team Configuration */}
      <TeamConfigSection />

      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-xs text-gray-500">
            Claude Home: <span className="font-mono">{data.claudeHome}</span>
          </p>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/50 border border-white/60 text-gray-500">
            {data.directories.length} dirs / {data.configFiles.length + data.dataFiles.length} files
          </span>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg bg-white/50 hover:bg-white/70 border border-white/60 text-gray-600 transition-colors disabled:opacity-50"
        >
          {loading ? "Scanning..." : "Refresh"}
        </button>
      </div>

      {/* Discovered Components */}
      <GlassCard>
        <div
          className="flex items-center gap-2 cursor-pointer mb-2"
          onClick={() => setComponentsOpen((p) => !p)}
        >
          <span className={`text-xs text-gray-400 transition-transform ${componentsOpen ? "rotate-90" : ""}`}>&#9654;</span>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Discovered Components
          </h3>
          <span className="text-xs text-gray-400">{visibleDirs.length} items</span>
        </div>
        {componentsOpen && (
          visibleDirs.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-4 text-center">
              No components detected in {data.claudeHome}
            </p>
          ) : (
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0.5">
                {(visibleDirs.length > 8 && !componentsShowAll
                  ? visibleDirs.slice(0, 8)
                  : visibleDirs
                ).map((d) => (
                  <DirCard key={d.path} dir={d} />
                ))}
              </div>
              {visibleDirs.length > 8 && !componentsShowAll && (
                <button
                  onClick={() => setComponentsShowAll(true)}
                  className="mt-2 text-xs text-blue-500 hover:text-blue-700 transition-colors w-full text-center py-1"
                >
                  Show all ({visibleDirs.length})
                </button>
              )}
            </div>
          )
        )}
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Config Files */}
        <GlassCard>
          <div
            className="flex items-center gap-2 cursor-pointer mb-2"
            onClick={() => setConfigOpen((p) => !p)}
          >
            <span className={`text-xs text-gray-400 transition-transform ${configOpen ? "rotate-90" : ""}`}>&#9654;</span>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Config Files
            </h3>
            <span className="text-xs text-gray-400">{data.configFiles.length} files</span>
          </div>
          {configOpen && (
            data.configFiles.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-4 text-center">No config files found</p>
            ) : (
              <div className="space-y-0.5">
                {data.configFiles.map((f) => (
                  <FileRow key={f.path} file={f} />
                ))}
              </div>
            )
          )}
        </GlassCard>

        {/* Runtime */}
        <GlassCard>
          <div
            className="flex items-center gap-2 cursor-pointer mb-2"
            onClick={() => setRuntimeOpen((p) => !p)}
          >
            <span className={`text-xs text-gray-400 transition-transform ${runtimeOpen ? "rotate-90" : ""}`}>&#9654;</span>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Runtime
            </h3>
          </div>
          {runtimeOpen && (
            <>
              <div className="grid grid-cols-3 gap-4 text-center py-4">
                <div>
                  <p className="text-xs text-gray-400">Node.js</p>
                  <p className="text-sm font-medium text-gray-700">{data.runtime.nodeVersion}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Dashboard</p>
                  <p className="text-sm font-medium text-gray-700">v{data.runtime.dashboardVersion}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Platform</p>
                  <p className="text-sm font-medium text-gray-700">{data.runtime.platform}</p>
                </div>
              </div>

              {data.dataFiles.length > 0 && (
                <>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4 mb-2">
                    Data Files
                  </h4>
                  <div className="space-y-0.5">
                    {data.dataFiles.slice(0, 10).map((f) => (
                      <FileRow key={f.path} file={f} />
                    ))}
                    {data.dataFiles.length > 10 && (
                      <p className="text-xs text-gray-400 text-center py-1">
                        +{data.dataFiles.length - 10} more files
                      </p>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
