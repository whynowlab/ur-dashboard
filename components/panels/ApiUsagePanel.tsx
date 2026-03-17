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
import type { ModelCost } from "@/lib/types";

interface Props {
  costs: ModelCost[];
  total: number;
}

const COLORS: Record<string, string> = {
  openai: "#10b981",
  gemini: "#6366f1",
  tripo: "#f59e0b",
};

function shortModel(model: string): string {
  return model
    .replace("-2026-03-05", "")
    .replace("-preview", "")
    .replace("gemini-3.1-", "G-")
    .replace("gpt-5.4", "GPT-5.4");
}

export function ApiUsagePanel({ costs, total }: Props) {
  const chartData = costs.map((c) => ({
    name: shortModel(c.model),
    cost: Number(c.cost.toFixed(2)),
    provider: c.provider,
  }));

  return (
    <GlassCard className="h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          API Usage
        </h2>
        <span className="text-2xl font-bold text-gray-900">
          ${total.toFixed(2)}
        </span>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 60, right: 20 }}
          >
            <XAxis
              type="number"
              tickFormatter={(v) => `$${v}`}
              fontSize={11}
            />
            <YAxis type="category" dataKey="name" fontSize={11} width={55} />
            <Tooltip
              formatter={(value) => [`$${Number(value).toFixed(2)}`, "Cost"]}
              contentStyle={{
                background: "rgba(255,255,255,0.8)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.5)",
                borderRadius: "12px",
              }}
            />
            <Bar dataKey="cost" radius={[0, 6, 6, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={COLORS[entry.provider] || "#94a3b8"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> OpenAI
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-indigo-500" /> Gemini
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> Tripo3D
        </span>
      </div>
    </GlassCard>
  );
}
