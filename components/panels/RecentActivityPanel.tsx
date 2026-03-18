"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import type { RecentFile } from "@/lib/types";

interface Props {
  files: RecentFile[];
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

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

const CATEGORY_COLORS: Record<string, string> = {
  skills: "bg-indigo-400",
  commands: "bg-emerald-400",
  agents: "bg-amber-400",
  plugins: "bg-pink-400",
  rules: "bg-purple-400",
  projects: "bg-cyan-400",
  hooks: "bg-orange-400",
  sessions: "bg-teal-400",
  todos: "bg-rose-400",
  plans: "bg-lime-400",
};

export function RecentActivityPanel({ files }: Props) {
  if (files.length === 0) {
    return (
      <GlassCard className="h-full">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          Recent Activity
        </h2>
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <p className="text-sm">No recent activity</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="h-full overflow-auto">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
        Recent Activity
      </h2>

      <div className="space-y-1.5">
        {files.map((f, i) => (
          <div key={i} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-white/30 transition-colors">
            <span className="text-xs text-gray-400 whitespace-nowrap w-14 text-right">
              {timeAgo(f.mtime)}
            </span>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${CATEGORY_COLORS[f.category] || "bg-gray-400"}`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-800 truncate">{f.name}</p>
              <p className="text-xs text-gray-400">{f.category}/</p>
            </div>
            <span className="text-xs text-gray-300 shrink-0">
              {formatSize(f.size)}
            </span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
