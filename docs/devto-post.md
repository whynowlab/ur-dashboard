---
title: "I Run 5 Claude Code Agents at Once. I Had No Idea What They Were Doing."
published: false
description: "ur-dashboard: zero-config real-time monitoring for Claude Code multi-agent workflows. One npm command, full visibility into agents, costs, and skills."
tags: ai, devtools, monitoring, showdev
cover_image: https://raw.githubusercontent.com/whynowlab/ur-dashboard/main/docs/assets/hero-dashboard.png
canonical_url: https://github.com/whynowlab/ur-dashboard
---

I run 16 agent teams. Engineering, research, design, marketing, security — each team with 3-5 specialized agents working in parallel. On a busy day, that's 40+ concurrent Claude Code processes across my machines.

The problem wasn't running them. Claude Code handles that fine. The problem was knowing what was happening.

Which team finished? Which agent is stuck waiting for a permission prompt? Did the research team burn through $8 on a task I expected to cost $2? Is the code-review team actually running, or did it silently crash 20 minutes ago?

I had no answers. Just a wall of terminal windows.

So I built [ur-dashboard](https://github.com/whynowlab/ur-dashboard). ur-dashboard is a zero-config, real-time monitoring dashboard for Claude Code multi-agent workflows. One npm install, one command, and you get a single screen showing every agent, every cost, every skill — updated every 5 seconds via Server-Sent Events.

```bash
npm install -g ur-dashboard
ur-dashboard
```

Open `http://localhost:3000`. Done.

![ur-dashboard showing agent activity, usage metrics, team panels, and skill tracking](https://raw.githubusercontent.com/whynowlab/ur-dashboard/main/docs/assets/hero-dashboard.png)

---

## Why is there no built-in monitoring for Claude Code agents?

Claude Code is great at running agents. But once you scale beyond 2-3 agents, you lose visibility. There's no built-in way to see:

- Which agents are active right now
- How much each model costs you per session
- Whether your team groupings are actually being used
- What skills your agents invoke most often

Existing LLM observability tools (Langfuse, Helicone, LangSmith) solve this for production APIs — but they all require SDK integration, API keys, and infrastructure setup. If you just want to see what your local Claude Code agents are doing right now, there was nothing.

ur-dashboard fills that gap. It reads your existing `~/.claude/` directory with zero configuration — no SDK, no API keys, no infrastructure. Install with `npm install -g ur-dashboard`, run `ur-dashboard`, and open `localhost:3000`.

---

## Who should use ur-dashboard?

ur-dashboard is designed for developers who run 2 or more Claude Code agents simultaneously. Specifically:

- You run multiple Claude Code agents and lose track of what's happening
- You want to know how much your AI workflows cost before the bill arrives
- You manage agent teams and need a visual overview of who's active
- You want to organize your agents into departments without editing config files by hand

---

## What does ur-dashboard show?

### Real-time agent monitoring

The dashboard auto-detects agents from `~/.claude/agents/` and displays each agent's current status (active, idle, or stopped). If you're using an orchestrator, it picks up team groupings automatically. Status updates arrive every 5 seconds with no page refresh needed.

### API cost tracking

ur-dashboard reads JSONL usage logs from `~/.claude/` and calculates costs per model in real time:

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|:---------------------:|:----------------------:|
| gpt-5.4 | $2.50 | $15.00 |
| gemini-3.1-pro | $2.00 | $12.00 |
| claude-sonnet-4 | $3.00 | $15.00 |

Costs are aggregated across all providers (OpenAI, Google, Anthropic) and displayed as a single total. You see exactly how much each model costs per session.

### Team management

Group agents into teams directly from the Settings tab. Save configurations. The dashboard persists groupings to `~/.claude/agents/teams.json`:

```json
{
  "teams": {
    "engineering": {
      "description": "Core development",
      "agents": ["code-reviewer", "implementer", "tester"]
    }
  }
}
```

No team config? It auto-groups agents by filename prefix.

### Dispatch API

Trigger agents programmatically from any script or workflow:

```bash
# Start an agent
curl -X POST http://localhost:3000/api/dispatch \
  -H "Content-Type: application/json" \
  -d '{"agent": "code-reviewer", "prompt": "Review the auth module"}'

# Stream output in real-time
curl -N http://localhost:3000/api/dispatch/{jobId}/stream

# Cancel if needed
curl -X DELETE http://localhost:3000/api/dispatch/{jobId}
```

The Dispatch API supports a maximum of 3 concurrent jobs with configurable timeouts. All inputs are validated, and commands use `spawn` with `shell: false` to prevent shell injection.

---

## How does ur-dashboard compare to Langfuse, Helicone, and LangSmith?

| Feature | ur-dashboard | Langfuse | Helicone | LangSmith |
|---------|:----------:|:--------:|:--------:|:---------:|
| Zero config | ✅ | ❌ | ❌ | ❌ |
| Claude Code native | ✅ | ❌ | ❌ | ❌ |
| Open source (MIT) | ✅ | ✅ | ❌ | ❌ |
| `npx` one-liner install | ✅ | ❌ | ❌ | ❌ |
| SDK integration required | ❌ | ✅ | ✅ | ✅ |
| Agent dispatch API | ✅ | ❌ | ❌ | ❌ |
| Self-hosted | ✅ | ✅ | ❌ | ❌ |

The key difference: Langfuse, Helicone, and LangSmith are general-purpose LLM observability platforms designed for production API tracing. They require SDK integration, API keys, and infrastructure setup.

ur-dashboard is purpose-built for Claude Code local development. It reads your existing `~/.claude/` directory with zero instrumentation — no code changes, no API keys, no hosted service. If you're already using Langfuse for production tracing, ur-dashboard is not a replacement. It solves a different problem: real-time visibility into local multi-agent workflows.

---

## How does ur-dashboard stream data to the browser?

The main dashboard endpoint (`GET /api/stream`) uses Server-Sent Events (SSE) over a persistent HTTP connection:

```json
{
  "usage": [{ "model": "gpt-5.4", "cost": 0.42 }],
  "totalCost": 1.87,
  "teams": [{ "name": "engineering", "agentCount": 3, "status": "active" }],
  "commits": [{ "message": "fix auth bug", "project": "api" }],
  "skills": [{ "skill": "tdd", "count": 12 }],
  "capabilities": { "canDispatch": true, "cliVersion": "2.1.78" }
}
```

There is no polling. The browser receives updates every 5 seconds via a single persistent SSE connection, keeping network overhead minimal.

---

## What is ur-dashboard built with?

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router, standalone) |
| UI | React 19 + Tailwind CSS 4 (glassmorphism) |
| Charts | Recharts 3 |
| Streaming | Server-Sent Events |
| Security | `spawn` with `shell: false`, input validation, path traversal prevention |

The entire dashboard ships as a pre-built Next.js standalone binary. Running `npx ur-dashboard` starts the server directly — there is no build step on the user's machine.

---

## FAQ

### Does ur-dashboard work without an orchestrator?

Yes. ur-dashboard works without any orchestrator. It scans `~/.claude/agents/` and auto-detects agents by filename. If you do have an orchestrator, it picks up team definitions from `teams.json` automatically.

### Does ur-dashboard work on Windows?

Yes. ur-dashboard runs on both macOS and Windows. It uses `os.homedir()` for cross-platform path resolution and falls back to `taskkill` for process management on Windows.

### Does ur-dashboard modify my Claude Code files?

No. ur-dashboard only reads from `~/.claude/`. The only file it writes is `~/.claude/agents/teams.json`, and only when you explicitly save team configurations from the Settings tab. Your agent files are never modified or deleted.

### Is the Dispatch API safe?

Yes. All CLI execution uses `child_process.spawn` with `shell: false`. User prompts are passed as a single argument — never interpolated into shell commands. Agent names are validated against path traversal. Permission mode is restricted to an allowlist of three values: `default`, `acceptEdits`, and `plan`.

### How much does ur-dashboard cost?

ur-dashboard is free and open source under the MIT license. There is no hosted service, no account required, and no telemetry. It runs entirely on your local machine.

### Can I use ur-dashboard with non-Claude AI agents?

ur-dashboard is purpose-built for Claude Code. It reads Claude Code's `~/.claude/` directory structure and JSONL usage logs. It does not currently support other AI coding assistants such as Cursor, Windsurf, or GitHub Copilot.

---

## Get started

```bash
# Global install (recommended)
npm install -g ur-dashboard
ur-dashboard

# Or try without installing
npx ur-dashboard
```

Works on macOS and Windows. MIT licensed. No account or API key required.

---

Links:
- [GitHub](https://github.com/whynowlab/ur-dashboard)
- [npm](https://www.npmjs.com/package/ur-dashboard)

If you're running multi-agent Claude Code workflows and want visibility without setup overhead — give it a try. Stars, issues, and PRs are welcome.
