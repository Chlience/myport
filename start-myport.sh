#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${MYPORT_PORT:-${PORT:-9000}}"
HOST="${MYPORT_HOST:-0.0.0.0}"
LOG_DIR="${MYPORT_LOG_DIR:-$APP_DIR/logs}"
PID_FILE="${MYPORT_PID_FILE:-$LOG_DIR/myport.pid}"
LOG_FILE="${MYPORT_LOG_FILE:-$LOG_DIR/myport-$(date +%F).log}"
SKIP_BUILD="${MYPORT_SKIP_BUILD:-false}"

is_pid_running() {
  local pid="${1:-}"
  [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null
}

pid_cwd() {
  local pid="${1:-}"
  readlink -f "/proc/$pid/cwd" 2>/dev/null || true
}

mkdir -p "$LOG_DIR"

if [[ -f "$PID_FILE" ]]; then
  existing_pid="$(tr -dc '0-9' < "$PID_FILE" || true)"
  if is_pid_running "$existing_pid" && [[ "$(pid_cwd "$existing_pid")" == "$APP_DIR" ]]; then
    echo "MyPort is already running: PID $existing_pid"
    echo "Log: ${LOG_FILE#$APP_DIR/}"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

if [[ "$SKIP_BUILD" != "true" ]]; then
  echo "Building MyPort..."
  (cd "$APP_DIR" && npm run build)
fi

if [[ ! -f "$APP_DIR/.next/BUILD_ID" ]]; then
  echo "MyPort production build not found. Run: npm run build" >&2
  exit 1
fi

echo "Starting MyPort..."
echo "Log: ${LOG_FILE#$APP_DIR/}"

setsid bash -c 'cd "$1" && exec npm run start -- -H "$2" -p "$3"' bash "$APP_DIR" "$HOST" "$PORT" >> "$LOG_FILE" 2>&1 &
pid=$!
printf '%s\n' "$pid" > "$PID_FILE"

disown "$pid" 2>/dev/null || true

echo "MyPort started: PID $pid"
