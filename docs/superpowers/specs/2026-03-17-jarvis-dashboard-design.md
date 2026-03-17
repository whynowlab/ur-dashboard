# Jarvis Dashboard — Design Spec

## Overview
Next.js full-stack web dashboard for monitoring Jarvis orchestrator system.
Runs on `localhost:3000`, opened in browser pane alongside terminal.

## Requirements
- API key usage display (Gemini, OpenAI, Tripo3D) with cost calculation
- Team/department status (standby/active) from 15 teams
- Completed commit log feed
- Real-time updates via SSE (5s interval)
- Light Glassmorphism UI (translucent cards, blur, modern)
- Extensible panel system via config file

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **UI**: React 19 + Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **Real-time**: Server-Sent Events (SSE)
- **Data**: File-based (JSONL/JSON reads, no database)

## Architecture

### Project Structure
```
~/Projects/jarvis-dashboard/
├── app/
│   ├── layout.tsx              # Global layout + Glassmorphism background
│   ├── page.tsx                # Main dashboard (grid)
│   └── api/
│       ├── stream/route.ts     # SSE endpoint
│       ├── usage/route.ts      # API usage query
│       ├── teams/route.ts      # Team status query
│       └── commits/route.ts    # Commit history query
├── components/
│   ├── panels/
│   │   ├── ApiUsagePanel.tsx   # API usage + cost chart
│   │   ├── TeamStatusPanel.tsx # Team standby/active grid
│   │   └── CommitLogPanel.tsx  # Recent commits feed
│   ├── ui/                     # GlassCard, Gauge, Badge
│   └── dashboard-config.ts     # Panel registry
├── lib/
│   ├── data-reader.ts          # JSONL/JSON file parser
│   ├── sse.ts                  # SSE helper
│   └── pricing.ts              # Model token pricing table
├── dashboard.config.json        # Panel toggle, refresh, paths
├── public/
└── bin/
    └── dash.sh                 # Launch script
```

### Data Sources

| Panel | Source | Path |
|-------|--------|------|
| API Usage | JSONL logs | `~/.claude/orchestrator/state/openai-usage.jsonl` |
| | | `~/.claude/orchestrator/state/gemini-usage.jsonl` |
| | | `~/.claude/orchestrator/state/tripo3d-usage.jsonl` |
| Team Status | JSON configs | `~/.claude/orchestrator/agents/teams.json` |
| | | `~/.claude/orchestrator/state/pipeline.json` |
| | | `~/.claude/orchestrator/state/agents/*.pid` |
| Commits | JSONL timeline | `~/.claude/orchestrator/state/timeline.jsonl` |

### Data Flow
1. API routes read orchestrator state files on each request
2. SSE endpoint (`/api/stream`) polls files every 5s, pushes diffs
3. Frontend subscribes to SSE on mount, updates panels reactively

### Pricing Table (embedded in `lib/pricing.ts`)
- GPT-5.4: $2.50 / $15.00 per 1M (input/output)
- GPT-5.4-pro: $30.00 / $180.00 per 1M
- Gemini-3.1-pro: $2.00 / $12.00 per 1M
- Gemini-3.1-flash-lite: $0.10 / $0.40 per 1M
- Tripo3D: $0.30 per task

## UI Design

### Style: Light Glassmorphism
- Light gradient background (soft blue/purple/white)
- Translucent cards with `backdrop-blur` and subtle borders
- Green pulse animation for active teams
- Muted gray for standby teams
- Clean typography, minimal color palette

### Layout
```
┌─────────────────────────────────────────────┐
│  Jarvis Dashboard               localhost    │
├──────────────┬──────────────────────────────┤
│  API Usage   │  Team Status Grid            │
│  (bar chart) │  (15 teams, status badges)   │
├──────────────┴──────────────────────────────┤
│  Recent Commits (scrollable feed)            │
└──────────────────────────────────────────────┘
```

### Responsive: fixed layout optimized for side-pane viewing (min-width: 400px)

## Extensibility

### dashboard.config.json
```json
{
  "panels": ["api-usage", "team-status", "commit-log"],
  "refresh_interval": 5000,
  "data_path": "~/.claude/orchestrator/state",
  "teams_path": "~/.claude/orchestrator/agents/teams.json",
  "port": 3000
}
```

Adding a panel:
1. Create `components/panels/NewPanel.tsx`
2. Register in `dashboard-config.ts`
3. Add to `panels` array in config

## Launch Script (bin/dash.sh)
```bash
#!/bin/bash
PORT=3000
PID_FILE="/tmp/jarvis-dashboard.pid"

case "${1:-start}" in
  start)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat $PID_FILE)" 2>/dev/null; then
      open "http://localhost:$PORT"
    else
      cd ~/Projects/jarvis-dashboard
      npx next dev -p $PORT &
      echo $! > "$PID_FILE"
      sleep 2
      open "http://localhost:$PORT"
    fi
    ;;
  stop)
    [ -f "$PID_FILE" ] && kill "$(cat $PID_FILE)" && rm "$PID_FILE"
    ;;
esac
```

## Non-Goals
- No authentication (local only)
- No database (file reads only)
- No mobile responsive (desktop pane only)
- No team dispatch from dashboard (read-only v1)
