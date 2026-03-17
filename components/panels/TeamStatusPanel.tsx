"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { TeamStatus } from "@/lib/types";

interface Props {
  teams: TeamStatus[];
}

export function TeamStatusPanel({ teams }: Props) {
  const active = teams.filter((t) => t.status === "active").length;

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
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {team.name}
              </p>
              {team.currentAgent && (
                <p className="text-xs text-gray-500 truncate">
                  {team.currentAgent} ({team.currentStep}/{team.totalSteps})
                </p>
              )}
            </div>
            <StatusBadge status={team.status} />
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
