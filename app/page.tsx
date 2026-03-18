"use client";

import { useEffect, useState } from "react";
import { ApiUsagePanel } from "@/components/panels/ApiUsagePanel";
import { TeamStatusPanel } from "@/components/panels/TeamStatusPanel";
import { CommitLogPanel } from "@/components/panels/CommitLogPanel";
import { SkillUsagePanel } from "@/components/panels/SkillUsagePanel";
import type { DashboardData } from "@/lib/types";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const es = new EventSource("/api/stream");

    es.onopen = () => setConnected(true);
    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as DashboardData;
        if (!("error" in parsed)) setData(parsed);
      } catch {
        /* ignore parse errors */
      }
    };
    es.onerror = () => setConnected(false);

    return () => es.close();
  }, []);

  return (
    <main className="min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Jarvis Dashboard</h1>
          <p className="text-xs text-gray-500">Orchestrator Monitor</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span
            className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500" : "bg-red-400"}`}
          />
          {connected ? "Live" : "Disconnected"}
          {data?.updatedAt && (
            <span className="ml-2">
              {new Date(data.updatedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {!data ? (
        <div className="flex items-center justify-center h-64 text-gray-400">
          Connecting...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-120px)]">
          {/* Left: API Usage */}
          <div className="lg:col-span-1">
            <ApiUsagePanel costs={data.usage} total={data.totalCost} />
          </div>

          {/* Right: Team Status */}
          <div className="lg:col-span-2">
            <TeamStatusPanel teams={data.teams} />
          </div>

          {/* Bottom left: Skill Usage */}
          <div className="lg:col-span-1">
            <SkillUsagePanel skills={data.skills} />
          </div>

          {/* Bottom right: Commits */}
          <div className="lg:col-span-2">
            <CommitLogPanel commits={data.commits} />
          </div>
        </div>
      )}
    </main>
  );
}
