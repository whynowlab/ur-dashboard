"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";

interface Agent {
  name: string;
  filename?: string;
}

interface Props {
  agents: Agent[];
  onClose: () => void;
  onJobStarted: (jobId: string) => void;
  preselectedAgent?: string;
}

export function DispatchPanel({ agents, onClose, onJobStarted, preselectedAgent }: Props) {
  const [agent, setAgent] = useState(preselectedAgent || "");
  const [prompt, setPrompt] = useState("");
  const [permissionMode, setPermissionMode] = useState<"default" | "acceptEdits" | "plan">("default");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    if (!agent || !prompt.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent, prompt: prompt.trim(), permissionMode }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      onJobStarted(data.jobId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to dispatch");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <GlassCard className="relative">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Close"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
        Dispatch Agent
      </h2>

      <div className="space-y-4">
        {/* Agent selector */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Agent</label>
          <select
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
            className="w-full text-sm text-gray-800 bg-white/60 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
          >
            <option value="">Select an agent...</option>
            {agents.map((a) => (
              <option key={a.filename || a.name} value={a.filename || a.name}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {/* Prompt textarea */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the task..."
            rows={4}
            className="w-full text-sm text-gray-800 bg-white/60 border border-gray-200 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
          />
        </div>

        {/* Permission mode */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Permission Mode</label>
          <select
            value={permissionMode}
            onChange={(e) => setPermissionMode(e.target.value as "default" | "acceptEdits" | "plan")}
            className="w-full text-sm text-gray-800 bg-white/60 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent"
          >
            <option value="default">Default</option>
            <option value="acceptEdits">Accept Edits</option>
            <option value="plan">Plan Only</option>
          </select>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        {/* Run button */}
        <button
          onClick={handleRun}
          disabled={submitting || !agent || !prompt.trim()}
          className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            submitting || !agent || !prompt.trim()
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-indigo-500 text-white hover:bg-indigo-600 shadow-sm"
          }`}
        >
          {submitting ? "Dispatching..." : "Run"}
        </button>
      </div>
    </GlassCard>
  );
}
