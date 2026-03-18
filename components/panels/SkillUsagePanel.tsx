"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import type { SkillUsageEntry } from "@/lib/types";

interface Props {
  skills: SkillUsageEntry[];
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function SkillUsagePanel({ skills }: Props) {
  const total = skills.reduce((sum, s) => sum + s.count, 0);

  return (
    <GlassCard className="h-full overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Skill Usage
        </h2>
        <span className="text-xs text-gray-500">
          {total} total invocations
        </span>
      </div>

      {skills.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No skill usage recorded yet</p>
      ) : (
        <div className="space-y-2">
          {skills.map((s) => (
            <div key={s.skill} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-800 truncate">
                    {s.skill}
                  </span>
                  <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                    {s.count}x
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-200/60 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-400 rounded-full transition-all"
                      style={{
                        width: `${Math.min((s.count / (skills[0]?.count || 1)) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">
                    {timeAgo(s.lastUsed)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
