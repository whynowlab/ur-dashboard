"use client";

import { useEffect, useState } from "react";
import { ApiUsagePanel } from "@/components/panels/ApiUsagePanel";
import { TeamStatusPanel } from "@/components/panels/TeamStatusPanel";
import { CommitLogPanel } from "@/components/panels/CommitLogPanel";
import { SkillUsagePanel } from "@/components/panels/SkillUsagePanel";
import { ComponentsPanel } from "@/components/panels/ComponentsPanel";
import { RecentActivityPanel } from "@/components/panels/RecentActivityPanel";
import { SettingsView } from "@/components/panels/SettingsView";
import type { DashboardData } from "@/lib/types";

type Tab = "dashboard" | "settings";

const SETUP_BADGE: Record<string, { label: string; color: string }> = {
  full: { label: "Full Setup", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  minimal: { label: "Minimal Setup", color: "bg-amber-100 text-amber-700 border-amber-200" },
  none: { label: "No Environment", color: "bg-red-100 text-red-600 border-red-200" },
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [connected, setConnected] = useState(false);
  const [tab, setTab] = useState<Tab>("dashboard");

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

  const env = data?.environment;
  const badge = SETUP_BADGE[env?.setupLevel || "none"];
  const hasComponents = (data?.components?.length ?? 0) > 0;

  return (
    <main className="min-h-screen p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800">ur-dashboard</h1>
            <p className="text-xs text-gray-500">Claude Code Monitor</p>
          </div>
          {env && (
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${badge.color}`}
            >
              {badge.label}
            </span>
          )}
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

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-white/30 backdrop-blur-sm rounded-xl p-1 w-fit border border-white/40">
        <button
          onClick={() => setTab("dashboard")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            tab === "dashboard"
              ? "bg-white/70 text-gray-800 shadow-sm"
              : "text-gray-500 hover:text-gray-700 hover:bg-white/30"
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setTab("settings")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            tab === "settings"
              ? "bg-white/70 text-gray-800 shadow-sm"
              : "text-gray-500 hover:text-gray-700 hover:bg-white/30"
          }`}
        >
          Settings & Environment
        </button>
      </div>

      {/* Tab Content */}
      {tab === "dashboard" && (
        <>
          {!data ? (
            <div className="flex items-center justify-center h-64 text-gray-400">
              Connecting...
            </div>
          ) : (
            <div className="space-y-4">
              {/* Row 1: API Usage + Teams — always visible */}
              <div className="animate-fade-in delay-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="lg:col-span-1">
                  <ApiUsagePanel costs={data.usage} total={data.totalCost} />
                </div>
                <div className="md:col-span-1 lg:col-span-2">
                  <TeamStatusPanel teams={data.teams} />
                </div>
              </div>

              {/* Row 2: Skills + Commits — always visible */}
              <div className="animate-fade-in delay-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="lg:col-span-1">
                  <SkillUsagePanel skills={data.skills} />
                </div>
                <div className="md:col-span-1 lg:col-span-2">
                  <CommitLogPanel commits={data.commits} />
                </div>
              </div>

              {/* Row 3: Components + Recent Activity — from scan data */}
              {hasComponents && (
                <div className="animate-fade-in delay-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  <div className="lg:col-span-1">
                    <ComponentsPanel components={data.components} />
                  </div>
                  <div className="md:col-span-1 lg:col-span-2">
                    <RecentActivityPanel files={data.recentFiles || []} />
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tab === "settings" && <SettingsView />}

    </main>
  );
}
