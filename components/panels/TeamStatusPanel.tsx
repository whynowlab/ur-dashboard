"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { TeamStatus } from "@/lib/types";

interface Props {
  teams: TeamStatus[];
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TeamStatusPanel({ teams }: Props) {
  if (teams.length === 0) {
    return (
      <GlassCard className="h-full">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          Teams / Agents
        </h2>
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <p className="text-sm">No agents or teams found</p>
          <p className="text-xs mt-1">Add agents to ~/.claude/agents/ or configure orchestrator</p>
        </div>
      </GlassCard>
    );
  }

  const isAgentMode = teams.every((t) => t.mode === "agent");
  const active = teams.filter((t) => t.status === "active").length;

  if (isAgentMode) {
    return (
      <GlassCard className="h-full overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Agents
          </h2>
          <span className="text-xs text-gray-500">{teams.length} found</span>
        </div>
        <div className="space-y-1.5">
          {teams.map((agent) => (
            <div
              key={agent.name}
              className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50/40 hover:bg-white/40 transition-colors"
            >
              <span className="w-2 h-2 rounded-full shrink-0 bg-indigo-300" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 truncate">{agent.name}</p>
                {agent.description && (
                  <p className="text-xs text-gray-400 truncate">{agent.description}</p>
                )}
              </div>
              {agent.lastUpdate && (
                <span className="text-xs text-gray-300 shrink-0">{timeAgo(agent.lastUpdate)}</span>
              )}
            </div>
          ))}
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="h-full overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Teams
        </h2>
        <span className="text-xs text-gray-500">
          {active} active / {teams.length} total
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {teams.map((team) => (
          <div
            key={team.name}
            className={`
              flex items-center justify-between
              px-3 py-2 rounded-xl
              ${
                team.status === "active"
                  ? "bg-emerald-50/60"
                  : team.status === "interrupted"
                    ? "bg-amber-50/60"
                    : "bg-gray-50/40"
              }
            `}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-800 truncate">
                {team.name}
              </p>
              {team.currentAgent ? (
                <p className="text-xs text-gray-500 truncate">
                  {team.currentAgent} ({team.currentStep}/{team.totalSteps})
                </p>
              ) : team.agentCount > 1 ? (
                <p className="text-xs text-gray-400">{team.agentCount} agents</p>
              ) : null}
            </div>
            <StatusBadge status={team.status} />
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
