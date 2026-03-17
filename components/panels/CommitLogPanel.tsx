"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import type { CommitEntry } from "@/lib/types";

interface Props {
  commits: CommitEntry[];
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function commitIcon(msg: string): string {
  if (msg.startsWith("feat")) return "\u2726";
  if (msg.startsWith("fix")) return "\u25CF";
  if (msg.startsWith("chore")) return "\u25C6";
  if (msg.startsWith("refactor")) return "\u25C7";
  if (msg.startsWith("test")) return "\u25B2";
  return "\u25CB";
}

export function CommitLogPanel({ commits }: Props) {
  return (
    <GlassCard className="h-full overflow-auto">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
        Recent Commits
      </h2>

      <div className="space-y-2">
        {commits.length === 0 && (
          <p className="text-sm text-gray-400 italic">No commits recorded</p>
        )}
        {commits.map((c, i) => (
          <div key={i} className="flex items-start gap-3 py-1.5">
            <span className="text-xs text-gray-400 whitespace-nowrap mt-0.5 w-14 text-right">
              {timeAgo(c.ts)}
            </span>
            <span className="text-sm mt-0.5">{commitIcon(c.message)}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-800 truncate">{c.message}</p>
              <p className="text-xs text-gray-400">{c.project}</p>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
