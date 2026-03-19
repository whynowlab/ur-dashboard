---
title: "I Run 5 Claude Code Agents at Once. I Had No Idea What They Were Doing."
published: false
description: "ur-dashboard: zero-config real-time monitoring for Claude Code multi-agent workflows. One npm command, full visibility into agents, costs, and skills."
tags: ai, devtools, monitoring, showdev
cover_image: https://raw.githubusercontent.com/whynowlab/ur-dashboard/main/docs/assets/hero-dashboard.png
canonical_url: https://github.com/whynowlab/ur-dashboard
---

Here's the problem: you're running multiple Claude Code agents — one reviewing code, one implementing features, one doing research. You check in 10 minutes later.

Which one finished? Which one is stuck? How much did it cost?

You don't know. There's no dashboard. Just terminal windows.

I built [ur-dashboard](https://github.com/whynowlab/ur-dashboard) to fix that. One command, real-time visibility into every agent, every cost, every skill.

```bash
npm install -g ur-dashboard
ur-dashboard
```

Open `http://localhost:3000`. Done.

![ur-dashboard showing agent activity, usage metrics, team panels, and skill tracking](https://raw.githubusercontent.com/whynowlab/ur-dashboard/main/docs/assets/hero-dashboard.png)

---

## What is ur-dashboard?

ur-dashboard is a zero-config, real-time monitoring dashboard for Claude Code AI agents. It scans your local `~/.claude/` directory, auto-detects running agents, and streams everything to a browser dashboard via Server-Sent Events — updated every 5 seconds.

No config files. No API keys. No Docker. It reads what's already there.

---

## Who is this for?

- Claude Code power users managing multiple agents and skills
- AI developers who want visibility into what their agents are doing
- Teams running multi-agent workflows who need a shared monitoring view
- Anyone who wants to track API costs across OpenAI, Gemini, and other providers in real time

---

## What can you see?

### Real-time agent monitoring

The dashboard auto-detects agents from `~/.claude/agents/` and shows their status. If you're using an orchestrator, it picks up team groupings automatically.

### API cost tracking

Reads JSONL usage logs and calculates costs per model:

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|:---------------------:|:----------------------:|
| gpt-5.4 | $2.50 | $15.00 |
| gemini-3.1-pro | $2.00 | $12.00 |
| claude-sonnet-4 | $3.00 | $15.00 |

Costs are aggregated across all providers. You see the total at a glance.

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

Max 3 concurrent jobs. Configurable timeout. All inputs validated — `spawn` with `shell: false` to prevent injection.

---

## How does it compare to existing tools?

| Feature | ur-dashboard | Langfuse | Helicone | LangSmith |
|---------|:----------:|:--------:|:--------:|:---------:|
| Zero config | ✅ | ❌ | ❌ | ❌ |
| Claude Code native | ✅ | ❌ | ❌ | ❌ |
| Open source (MIT) | ✅ | ✅ | ❌ | ❌ |
| `npx` one-liner install | ✅ | ❌ | ❌ | ❌ |
| SDK integration required | ❌ | ✅ | ✅ | ✅ |
| Agent dispatch API | ✅ | ❌ | ❌ | ❌ |
| Self-hosted | ✅ | ✅ | ❌ | ❌ |

The key difference: Langfuse, Helicone, and LangSmith are general-purpose LLM observability platforms. They require SDK integration, API keys, and infrastructure setup.

ur-dashboard is purpose-built for Claude Code — it reads your existing `~/.claude/` directory with zero instrumentation. If you're already using Langfuse for production tracing, ur-dashboard isn't a replacement. It's for local development visibility when you're running multiple agents and need to see what's happening right now.

---

## How does the streaming work?

The main dashboard endpoint (`GET /api/stream`) sends Server-Sent Events:

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

No polling. The browser receives updates every 5 seconds via a persistent connection.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router, standalone) |
| UI | React 19 + Tailwind CSS 4 (glassmorphism) |
| Charts | Recharts 3 |
| Streaming | Server-Sent Events |
| Security | `spawn` with `shell: false`, input validation, path traversal prevention |

The entire dashboard ships as a pre-built Next.js standalone app. `npx ur-dashboard` runs `next start` — no build step on the user's machine.

---

## FAQ

### Does ur-dashboard work without an orchestrator?

Yes. It scans `~/.claude/agents/` and auto-detects agents by filename. No orchestrator needed. If you do have one, it picks up team definitions automatically.

### Does it work on Windows?

Yes. Tested on both macOS and Windows. Uses `os.homedir()` for cross-platform path resolution and `taskkill` fallback for process management on Windows.

### Does it modify my Claude Code files?

No. It only reads from `~/.claude/`. The only file it writes is `~/.claude/agents/teams.json` when you explicitly save team configurations from the Settings tab. Your agent files are never modified or deleted.

### Is the Dispatch API safe?

All CLI execution uses `child_process.spawn` with `shell: false`. User prompts are passed as a single argument — never interpolated into shell commands. Agent names are validated against path traversal. Permission mode is restricted to an allowlist (`default`, `acceptEdits`, `plan`).

---

## Get started

```bash
# Global install (recommended)
npm install -g ur-dashboard
ur-dashboard

# Or try without installing
npx ur-dashboard
```

Works on macOS and Windows. MIT licensed.

---

Links:- [GitHub](https://github.com/whynowlab/ur-dashboard)
- [npm](https://www.npmjs.com/package/ur-dashboard)

If you're running multi-agent Claude Code workflows and want visibility without setup overhead — give it a try. Stars, issues, and PRs are welcome.
