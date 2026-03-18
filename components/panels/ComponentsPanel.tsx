"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { ComponentStat } from "@/lib/types";

interface Props {
  components: ComponentStat[];
}

const COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6",
  "#14b8a6", "#f97316", "#06b6d4", "#84cc16", "#e11d48",
];

function timeAgo(ts: string | null): string {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function ComponentsPanel({ components }: Props) {
  if (components.length === 0) {
    return (
      <GlassCard className="h-full">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          Components
        </h2>
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <p className="text-sm">No components detected</p>
        </div>
      </GlassCard>
    );
  }

  const sorted = [...components].sort((a, b) => b.count - a.count);
  const totalItems = sorted.reduce((sum, c) => sum + c.count, 0);

  const chartData = sorted.slice(0, 8).map((c) => ({
    name: c.category,
    count: c.count,
  }));

  return (
    <GlassCard className="h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Components
        </h2>
        <span className="text-xs text-gray-500">
          {totalItems} items / {components.length} dirs
        </span>
      </div>

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 70, right: 10 }}
          >
            <XAxis type="number" fontSize={11} />
            <YAxis type="category" dataKey="name" fontSize={11} width={65} />
            <Tooltip
              contentStyle={{
                background: "rgba(255,255,255,0.8)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.5)",
                borderRadius: "12px",
              }}
            />
            <Bar dataKey="count" radius={[0, 6, 6, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1">
        {sorted.slice(0, 6).map((c, i) => (
          <div key={c.name} className="flex items-center gap-2 text-xs py-0.5">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="text-gray-600 truncate">{c.category}</span>
            <span className="text-gray-400 ml-auto">{c.count}</span>
            {c.lastModified && (
              <span className="text-gray-300">{timeAgo(c.lastModified)}</span>
            )}
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
