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
      sleep 3
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
