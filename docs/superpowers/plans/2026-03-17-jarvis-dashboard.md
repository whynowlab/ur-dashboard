# Jarvis Dashboard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-time web dashboard showing API usage costs, team status, and commit history from the Jarvis orchestrator state files.

**Architecture:** Next.js 15 App Router with SSE for real-time updates. API routes read JSONL/JSON files from `~/.claude/orchestrator/state/`. React frontend with Tailwind CSS + light Glassmorphism styling. No database — file-based reads only.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS 4, Recharts, TypeScript, pnpm

---

## File Map

| File | Responsibility |
|------|---------------|
| `app/layout.tsx` | Root layout, global styles, gradient background |
| `app/page.tsx` | Dashboard grid, SSE subscription, panel rendering |
| `app/globals.css` | Tailwind directives + glassmorphism utilities |
| `app/api/usage/route.ts` | Read *-usage.jsonl, compute costs, return JSON |
| `app/api/teams/route.ts` | Read teams.json + pipeline.json + PIDs, return status |
| `app/api/commits/route.ts` | Read timeline.jsonl, filter git commits, return JSON |
| `app/api/stream/route.ts` | SSE endpoint, polls all data every 5s |
| `components/panels/ApiUsagePanel.tsx` | Bar chart + cost summary per model |
| `components/panels/TeamStatusPanel.tsx` | Grid of 15 teams with status badges |
| `components/panels/CommitLogPanel.tsx` | Scrollable recent commits feed |
| `components/ui/GlassCard.tsx` | Reusable glassmorphism card wrapper |
| `components/ui/StatusBadge.tsx` | Active/standby/interrupted badge |
| `components/ui/PulseIndicator.tsx` | Green pulse dot for active items |
| `components/dashboard-config.ts` | Panel registry + type definitions |
| `lib/data-reader.ts` | JSONL parser + JSON file reader (with ~ expansion) |
| `lib/pricing.ts` | Model pricing table + cost calculator |
| `lib/types.ts` | Shared TypeScript types |
| `dashboard.config.json` | Runtime config (panels, paths, refresh interval) |
| `bin/dash.sh` | Launch/stop script |
| `tailwind.config.ts` | Tailwind config (if customization needed beyond v4 defaults) |

---

## Chunk 1: Project Bootstrap + Data Layer

### Task 1: Initialize Next.js project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`

- [ ] **Step 1: Scaffold Next.js with pnpm**

```bash
cd ~/Projects/jarvis-dashboard
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-pnpm --turbopack
```

Accept defaults. This creates the base Next.js 15 project with Tailwind v4.

- [ ] **Step 2: Install dependencies**

```bash
cd ~/Projects/jarvis-dashboard
pnpm add recharts
pnpm add -D @types/node
```

- [ ] **Step 3: Verify dev server starts**

```bash
cd ~/Projects/jarvis-dashboard && pnpm dev &
sleep 3 && curl -s http://localhost:3000 | head -5
kill %1
```

Expected: HTML response from Next.js

- [ ] **Step 4: Initialize git**

```bash
cd ~/Projects/jarvis-dashboard
git init
echo "node_modules/\n.next/\n.env.local" > .gitignore
git add -A
git commit -m "chore: init Next.js 15 project with Tailwind and Recharts"
```

---

### Task 2: Dashboard config + types

**Files:**
- Create: `dashboard.config.json`
- Create: `lib/types.ts`
- Create: `components/dashboard-config.ts`

- [ ] **Step 1: Create config file**

`dashboard.config.json`:
```json
{
  "panels": ["api-usage", "team-status", "commit-log"],
  "refresh_interval": 5000,
  "data_path": "~/.claude/orchestrator/state",
  "teams_path": "~/.claude/orchestrator/agents/teams.json",
  "port": 3000
}
```

- [ ] **Step 2: Create shared types**

`lib/types.ts`:
```typescript
export interface UsageRecord {
  ts: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface TripoRecord {
  ts: string;
  task_id: string;
  image: string;
  output: string;
  size: number;
}

export interface ModelCost {
  model: string;
  provider: "openai" | "gemini" | "tripo";
  prompt_tokens: number;
  completion_tokens: number;
  cost: number;
}

export interface TeamAgent {
  name: string;
  prompt_file: string;
  engine: string;
  model: string;
  phase: string;
}

export interface TeamDefinition {
  description: string;
  mode: string;
  agents: TeamAgent[];
}

export interface PipelineEntry {
  team: string;
  mode: string;
  agents: string[];
  total: number;
  step: number;
  current: string;
  status: "running" | "interrupted" | "complete";
  ts: string;
}

export interface TeamStatus {
  name: string;
  description: string;
  mode: string;
  agentCount: number;
  status: "active" | "standby" | "interrupted";
  currentStep?: number;
  totalSteps?: number;
  currentAgent?: string;
  lastUpdate?: string;
}

export interface CommitEntry {
  ts: string;
  message: string;
  project: string;
}

export interface DashboardData {
  usage: ModelCost[];
  totalCost: number;
  teams: TeamStatus[];
  commits: CommitEntry[];
  updatedAt: string;
}

export interface PanelConfig {
  id: string;
  label: string;
  component: string;
}
```

- [ ] **Step 3: Create panel registry**

`components/dashboard-config.ts`:
```typescript
import type { PanelConfig } from "@/lib/types";

export const PANEL_REGISTRY: Record<string, PanelConfig> = {
  "api-usage": {
    id: "api-usage",
    label: "API Usage",
    component: "ApiUsagePanel",
  },
  "team-status": {
    id: "team-status",
    label: "Team Status",
    component: "TeamStatusPanel",
  },
  "commit-log": {
    id: "commit-log",
    label: "Recent Commits",
    component: "CommitLogPanel",
  },
};
```

- [ ] **Step 4: Commit**

```bash
cd ~/Projects/jarvis-dashboard
git add dashboard.config.json lib/types.ts components/dashboard-config.ts
git commit -m "feat: add dashboard config, types, and panel registry"
```

---

### Task 3: Data reader + pricing engine

**Files:**
- Create: `lib/data-reader.ts`
- Create: `lib/pricing.ts`

- [ ] **Step 1: Create data-reader**

`lib/data-reader.ts`:
```typescript
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import type { UsageRecord, TripoRecord, CommitEntry, TeamDefinition, PipelineEntry, TeamStatus } from "./types";

function expandHome(p: string): string {
  return p.replace(/^~/, process.env.HOME || "/Users/dd");
}

export function readJsonlFile<T>(filePath: string): T[] {
  const resolved = expandHome(filePath);
  if (!existsSync(resolved)) return [];
  const content = readFileSync(resolved, "utf-8").trim();
  if (!content) return [];
  return content.split("\n").map((line) => JSON.parse(line) as T);
}

export function readJsonFile<T>(filePath: string): T | null {
  const resolved = expandHome(filePath);
  if (!existsSync(resolved)) return null;
  return JSON.parse(readFileSync(resolved, "utf-8")) as T;
}

export function getActiveAgentPids(stateDir: string): string[] {
  const dir = expandHome(join(stateDir, "agents"));
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".pid"))
    .map((f) => f.replace(".pid", ""));
}

export function readTeamStatuses(teamsPath: string, statePath: string): TeamStatus[] {
  const teamsData = readJsonFile<{ teams: Record<string, TeamDefinition> }>(teamsPath);
  const pipelineData = readJsonFile<Record<string, PipelineEntry>>(statePath + "/pipeline.json");
  const activePids = getActiveAgentPids(statePath);

  if (!teamsData) return [];

  return Object.entries(teamsData.teams).map(([name, team]) => {
    const pipeline = pipelineData?.[name];
    const hasActivePid = activePids.some((pid) =>
      team.agents.some((a) => a.name === pid)
    );

    let status: "active" | "standby" | "interrupted" = "standby";
    if (pipeline?.status === "running" || hasActivePid) status = "active";
    else if (pipeline?.status === "interrupted") status = "interrupted";

    return {
      name,
      description: team.description,
      mode: team.mode,
      agentCount: team.agents.length,
      status,
      currentStep: pipeline?.step,
      totalSteps: pipeline?.total,
      currentAgent: pipeline?.current,
      lastUpdate: pipeline?.ts,
    };
  });
}

export function readCommits(timelinePath: string, limit = 20): CommitEntry[] {
  const records = readJsonlFile<{ ts: string; tool: string; cmd: string; exit: number }>(timelinePath);
  return records
    .filter((r) => r.tool === "Bash" && r.cmd.includes("git commit") && r.exit === 0)
    .map((r) => {
      const msgMatch = r.cmd.match(/commit -m ["']?(?:\$\(cat <<'?EOF'?\n)?(.+?)(?:\nEOF\n\))?["']?$/s);
      const projectMatch = r.cmd.match(/cd (?:~\/)?(?:Projects\/)?([^\s/&]+)/);
      return {
        ts: r.ts,
        message: msgMatch?.[1]?.slice(0, 80) || r.cmd.slice(0, 80),
        project: projectMatch?.[1] || "unknown",
      };
    })
    .reverse()
    .slice(0, limit);
}
```

- [ ] **Step 2: Create pricing engine**

`lib/pricing.ts`:
```typescript
import type { UsageRecord, TripoRecord, ModelCost } from "./types";

// Prices per 1M tokens [input, output]
const MODEL_PRICES: Record<string, [number, number]> = {
  "gpt-5.4-2026-03-05": [2.5, 15.0],
  "gpt-5.4": [2.5, 15.0],
  "gpt-5.4-pro": [30.0, 180.0],
  "gemini-3.1-pro-preview": [2.0, 12.0],
  "gemini-3.1-flash-lite-preview": [0.1, 0.4],
};

const TRIPO_PRICE_PER_TASK = 0.3;

export function calculateUsageCosts(
  openaiRecords: UsageRecord[],
  geminiRecords: UsageRecord[],
  tripoRecords: TripoRecord[]
): { costs: ModelCost[]; total: number } {
  const modelMap = new Map<string, { prompt: number; completion: number; provider: "openai" | "gemini" }>();

  for (const r of [...openaiRecords, ...geminiRecords]) {
    const provider = openaiRecords.includes(r) ? "openai" : "gemini";
    const existing = modelMap.get(r.model) || { prompt: 0, completion: 0, provider };
    existing.prompt += r.prompt_tokens;
    existing.completion += r.completion_tokens;
    modelMap.set(r.model, existing);
  }

  const costs: ModelCost[] = [];
  let total = 0;

  for (const [model, data] of modelMap) {
    const prices = MODEL_PRICES[model] || [1.0, 3.0]; // fallback
    const cost =
      (data.prompt / 1_000_000) * prices[0] +
      (data.completion / 1_000_000) * prices[1];
    costs.push({
      model,
      provider: data.provider,
      prompt_tokens: data.prompt,
      completion_tokens: data.completion,
      cost,
    });
    total += cost;
  }

  if (tripoRecords.length > 0) {
    const tripoCost = tripoRecords.length * TRIPO_PRICE_PER_TASK;
    costs.push({
      model: "tripo3d",
      provider: "tripo",
      prompt_tokens: 0,
      completion_tokens: 0,
      cost: tripoCost,
    });
    total += tripoCost;
  }

  return { costs: costs.sort((a, b) => b.cost - a.cost), total };
}
```

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/jarvis-dashboard
git add lib/data-reader.ts lib/pricing.ts
git commit -m "feat: add JSONL data reader and pricing engine"
```

---

## Chunk 2: API Routes

### Task 4: Usage API route

**Files:**
- Create: `app/api/usage/route.ts`

- [ ] **Step 1: Create usage endpoint**

`app/api/usage/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { readJsonlFile } from "@/lib/data-reader";
import { calculateUsageCosts } from "@/lib/pricing";
import type { UsageRecord, TripoRecord } from "@/lib/types";
import config from "@/dashboard.config.json";

export const dynamic = "force-dynamic";

export async function GET() {
  const basePath = config.data_path;
  const openai = readJsonlFile<UsageRecord>(`${basePath}/openai-usage.jsonl`);
  const gemini = readJsonlFile<UsageRecord>(`${basePath}/gemini-usage.jsonl`);
  const tripo = readJsonlFile<TripoRecord>(`${basePath}/tripo3d-usage.jsonl`);

  const { costs, total } = calculateUsageCosts(openai, gemini, tripo);
  return NextResponse.json({ costs, total });
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/Projects/jarvis-dashboard
git add app/api/usage/route.ts
git commit -m "feat: add /api/usage endpoint"
```

---

### Task 5: Teams API route

**Files:**
- Create: `app/api/teams/route.ts`

- [ ] **Step 1: Create teams endpoint**

`app/api/teams/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { readTeamStatuses } from "@/lib/data-reader";
import config from "@/dashboard.config.json";

export const dynamic = "force-dynamic";

export async function GET() {
  const teams = readTeamStatuses(config.teams_path, config.data_path);
  return NextResponse.json({ teams });
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/Projects/jarvis-dashboard
git add app/api/teams/route.ts
git commit -m "feat: add /api/teams endpoint"
```

---

### Task 6: Commits API route

**Files:**
- Create: `app/api/commits/route.ts`

- [ ] **Step 1: Create commits endpoint**

`app/api/commits/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { readCommits } from "@/lib/data-reader";
import config from "@/dashboard.config.json";

export const dynamic = "force-dynamic";

export async function GET() {
  const commits = readCommits(`${config.data_path}/timeline.jsonl`);
  return NextResponse.json({ commits });
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/Projects/jarvis-dashboard
git add app/api/commits/route.ts
git commit -m "feat: add /api/commits endpoint"
```

---

### Task 7: SSE stream endpoint

**Files:**
- Create: `app/api/stream/route.ts`

- [ ] **Step 1: Create SSE endpoint**

`app/api/stream/route.ts`:
```typescript
import { readJsonlFile } from "@/lib/data-reader";
import { readTeamStatuses, readCommits } from "@/lib/data-reader";
import { calculateUsageCosts } from "@/lib/pricing";
import type { UsageRecord, TripoRecord, DashboardData } from "@/lib/types";
import config from "@/dashboard.config.json";

export const dynamic = "force-dynamic";

function collectData(): DashboardData {
  const basePath = config.data_path;
  const openai = readJsonlFile<UsageRecord>(`${basePath}/openai-usage.jsonl`);
  const gemini = readJsonlFile<UsageRecord>(`${basePath}/gemini-usage.jsonl`);
  const tripo = readJsonlFile<TripoRecord>(`${basePath}/tripo3d-usage.jsonl`);
  const { costs, total } = calculateUsageCosts(openai, gemini, tripo);

  const teams = readTeamStatuses(config.teams_path, basePath);
  const commits = readCommits(`${basePath}/timeline.jsonl`);

  return { usage: costs, totalCost: total, teams, commits, updatedAt: new Date().toISOString() };
}

export async function GET() {
  const encoder = new TextEncoder();
  const interval = config.refresh_interval || 5000;

  const stream = new ReadableStream({
    start(controller) {
      const send = () => {
        try {
          const data = collectData();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (e) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(e) })}\n\n`));
        }
      };

      send(); // initial push
      const timer = setInterval(send, interval);

      // Cleanup when client disconnects
      const cleanup = () => clearInterval(timer);
      controller.enqueue(encoder.encode(":ok\n\n"));

      // Store cleanup for cancel
      (stream as any)._cleanup = cleanup;
    },
    cancel() {
      (stream as any)._cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/Projects/jarvis-dashboard
git add app/api/stream/route.ts
git commit -m "feat: add SSE stream endpoint for real-time updates"
```

---

## Chunk 3: UI Components

### Task 8: Glassmorphism base components

**Files:**
- Create: `components/ui/GlassCard.tsx`
- Create: `components/ui/StatusBadge.tsx`
- Create: `components/ui/PulseIndicator.tsx`

- [ ] **Step 1: Create GlassCard**

`components/ui/GlassCard.tsx`:
```tsx
interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export function GlassCard({ children, className = "" }: GlassCardProps) {
  return (
    <div
      className={`
        rounded-2xl
        bg-white/40
        backdrop-blur-xl
        border border-white/50
        shadow-[0_8px_32px_rgba(0,0,0,0.08)]
        p-6
        ${className}
      `}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create StatusBadge**

`components/ui/StatusBadge.tsx`:
```tsx
interface StatusBadgeProps {
  status: "active" | "standby" | "interrupted";
}

const styles = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  standby: "bg-gray-100 text-gray-500 border-gray-200",
  interrupted: "bg-amber-100 text-amber-700 border-amber-200",
};

const labels = {
  active: "Active",
  standby: "Standby",
  interrupted: "Interrupted",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        px-2.5 py-0.5
        rounded-full
        text-xs font-medium
        border
        ${styles[status]}
      `}
    >
      {status === "active" && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
      )}
      {labels[status]}
    </span>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/jarvis-dashboard
git add components/ui/
git commit -m "feat: add GlassCard and StatusBadge components"
```

---

### Task 9: ApiUsagePanel

**Files:**
- Create: `components/panels/ApiUsagePanel.tsx`

- [ ] **Step 1: Create API usage panel**

`components/panels/ApiUsagePanel.tsx`:
```tsx
"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
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
          <BarChart data={chartData} layout="vertical" margin={{ left: 60, right: 20 }}>
            <XAxis type="number" tickFormatter={(v) => `$${v}`} fontSize={11} />
            <YAxis type="category" dataKey="name" fontSize={11} width={55} />
            <Tooltip
              formatter={(value: number) => [`$${value.toFixed(2)}`, "Cost"]}
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
```

- [ ] **Step 2: Commit**

```bash
cd ~/Projects/jarvis-dashboard
git add components/panels/ApiUsagePanel.tsx
git commit -m "feat: add ApiUsagePanel with Recharts bar chart"
```

---

### Task 10: TeamStatusPanel

**Files:**
- Create: `components/panels/TeamStatusPanel.tsx`

- [ ] **Step 1: Create team status panel**

`components/panels/TeamStatusPanel.tsx`:
```tsx
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
              ${team.status === "active"
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
```

- [ ] **Step 2: Commit**

```bash
cd ~/Projects/jarvis-dashboard
git add components/panels/TeamStatusPanel.tsx
git commit -m "feat: add TeamStatusPanel with status grid"
```

---

### Task 11: CommitLogPanel

**Files:**
- Create: `components/panels/CommitLogPanel.tsx`

- [ ] **Step 1: Create commit log panel**

`components/panels/CommitLogPanel.tsx`:
```tsx
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
  if (msg.startsWith("feat")) return "✦";
  if (msg.startsWith("fix")) return "●";
  if (msg.startsWith("chore")) return "◆";
  if (msg.startsWith("refactor")) return "◇";
  if (msg.startsWith("test")) return "▲";
  return "○";
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
```

- [ ] **Step 2: Commit**

```bash
cd ~/Projects/jarvis-dashboard
git add components/panels/CommitLogPanel.tsx
git commit -m "feat: add CommitLogPanel with commit feed"
```

---

## Chunk 4: Dashboard Page + Layout + Launch

### Task 12: Global layout with Glassmorphism background

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Update globals.css**

Replace `app/globals.css` with:
```css
@import "tailwindcss";

:root {
  --bg-from: #e8eaf6;
  --bg-via: #f3e5f5;
  --bg-to: #e0f2f1;
}

body {
  min-height: 100vh;
  background: linear-gradient(135deg, var(--bg-from), var(--bg-via), var(--bg-to));
  background-attachment: fixed;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
}

/* Glassmorphism scrollbar */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 3px;
}
```

- [ ] **Step 2: Update layout.tsx**

Replace `app/layout.tsx` with:
```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jarvis Dashboard",
  description: "Orchestrator monitoring dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/jarvis-dashboard
git add app/layout.tsx app/globals.css
git commit -m "feat: glassmorphism layout with gradient background"
```

---

### Task 13: Main dashboard page with SSE

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Create dashboard page**

Replace `app/page.tsx` with:
```tsx
"use client";

import { useEffect, useState } from "react";
import { ApiUsagePanel } from "@/components/panels/ApiUsagePanel";
import { TeamStatusPanel } from "@/components/panels/TeamStatusPanel";
import { CommitLogPanel } from "@/components/panels/CommitLogPanel";
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
      } catch { /* ignore parse errors */ }
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
          <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500" : "bg-red-400"}`} />
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

          {/* Bottom: Commits (full width) */}
          <div className="lg:col-span-3">
            <CommitLogPanel commits={data.commits} />
          </div>
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/Projects/jarvis-dashboard
git add app/page.tsx
git commit -m "feat: main dashboard page with SSE real-time updates"
```

---

### Task 14: Launch script + alias

**Files:**
- Create: `bin/dash.sh`

- [ ] **Step 1: Create launch script**

`bin/dash.sh`:
```bash
#!/bin/bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORT=3000
PID_FILE="/tmp/jarvis-dashboard.pid"
LOG_FILE="/tmp/jarvis-dashboard.log"

case "${1:-start}" in
  start)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "Dashboard already running (PID $(cat "$PID_FILE"))"
      open "http://localhost:$PORT"
    else
      echo "Starting Jarvis Dashboard on port $PORT..."
      cd "$DIR"
      pnpm dev -p "$PORT" > "$LOG_FILE" 2>&1 &
      echo $! > "$PID_FILE"
      sleep 2
      if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "Dashboard running at http://localhost:$PORT"
        open "http://localhost:$PORT"
      else
        echo "Failed to start. Check $LOG_FILE"
        exit 1
      fi
    fi
    ;;
  stop)
    if [ -f "$PID_FILE" ]; then
      kill "$(cat "$PID_FILE")" 2>/dev/null && echo "Dashboard stopped" || echo "Process not found"
      rm -f "$PID_FILE"
    else
      echo "No dashboard running"
    fi
    ;;
  restart)
    "$0" stop
    sleep 1
    "$0" start
    ;;
  status)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "Running (PID $(cat "$PID_FILE")) at http://localhost:$PORT"
    else
      echo "Not running"
    fi
    ;;
  *)
    echo "Usage: dash {start|stop|restart|status}"
    ;;
esac
```

- [ ] **Step 2: Make executable**

```bash
chmod +x ~/Projects/jarvis-dashboard/bin/dash.sh
```

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/jarvis-dashboard
git add bin/dash.sh
git commit -m "feat: add dash launch script with start/stop/restart/status"
```

---

### Task 15: Smoke test

- [ ] **Step 1: Start dev server and verify all API routes**

```bash
cd ~/Projects/jarvis-dashboard && pnpm dev -p 3000 &
sleep 3
echo "=== Usage ===" && curl -s http://localhost:3000/api/usage | head -c 200
echo -e "\n=== Teams ===" && curl -s http://localhost:3000/api/teams | head -c 200
echo -e "\n=== Commits ===" && curl -s http://localhost:3000/api/commits | head -c 200
kill %1
```

Expected: JSON responses with actual data from orchestrator state files.

- [ ] **Step 2: Open in browser and verify UI renders**

```bash
cd ~/Projects/jarvis-dashboard && pnpm dev -p 3000 &
sleep 2 && open http://localhost:3000
```

Verify: Glassmorphism cards visible, API chart renders, teams show, commits listed.

- [ ] **Step 3: Final commit**

```bash
cd ~/Projects/jarvis-dashboard
git add -A
git commit -m "chore: smoke test passed, dashboard v1 complete"
```

---

## Summary

| Chunk | Tasks | What it delivers |
|-------|-------|------------------|
| 1: Bootstrap + Data | T1-T3 | Next.js project, config, types, JSONL reader, pricing engine |
| 2: API Routes | T4-T7 | REST + SSE endpoints reading orchestrator state files |
| 3: UI Components | T8-T11 | GlassCard, StatusBadge, 3 panels (usage, teams, commits) |
| 4: Page + Launch | T12-T15 | Dashboard page, glassmorphism layout, launch script, smoke test |
