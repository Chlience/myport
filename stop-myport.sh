#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${MYPORT_PORT:-${PORT:-9000}}"
LOG_DIR="${MYPORT_LOG_DIR:-$APP_DIR/logs}"
PID_FILE="${MYPORT_PID_FILE:-$LOG_DIR/myport.pid}"
STOP_TIMEOUT="${MYPORT_STOP_TIMEOUT:-10}"

is_pid_running() {
  local pid="${1:-}"
  [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null
}

pid_cwd() {
  local pid="${1:-}"
  readlink -f "/proc/$pid/cwd" 2>/dev/null || true
}

pid_group() {
  local pid="${1:-}"
  ps -o pgid= -p "$pid" 2>/dev/null | tr -d ' ' || true
}

wait_until_group_stops() {
  local pgid="$1"
  local deadline=$((SECONDS + STOP_TIMEOUT))
  while kill -0 -- "-$pgid" 2>/dev/null; do
    if (( SECONDS >= deadline )); then
      return 1
    fi
    sleep 1
  done
}

wait_until_pids_stop() {
  local deadline=$((SECONDS + STOP_TIMEOUT))
  local pid
  while :; do
    local any_running=false
    for pid in "$@"; do
      if is_pid_running "$pid"; then
        any_running=true
        break
      fi
    done
    [[ "$any_running" == false ]] && return 0
    if (( SECONDS >= deadline )); then
      return 1
    fi
    sleep 1
  done
}

listener_pids_on_port() {
  command -v ss >/dev/null 2>&1 || return 0
  ss -ltnupH 2>/dev/null \
    | awk -v port=":$PORT" '$4 ~ port"$" { print }' \
    | sed -n 's/.*pid=\([0-9][0-9]*\).*/\1/p' \
    | sort -u
}

project_listener_pids_on_port() {
  local pid
  while IFS= read -r pid; do
    [[ -z "$pid" ]] && continue
    if [[ "$(pid_cwd "$pid")" == "$APP_DIR" ]]; then
      printf '%s\n' "$pid"
    else
      echo "Skipping PID $pid on port $PORT because it was not started from $APP_DIR" >&2
    fi
  done < <(listener_pids_on_port)
}

stop_recorded_process_group() {
  local pid="$1"
  local pgid self_pgid
  pgid="$(pid_group "$pid")"
  self_pgid="$(pid_group "$$")"

  if [[ -n "$pgid" && "$pgid" != "$self_pgid" ]]; then
    kill -TERM -- "-$pgid" 2>/dev/null || true
    if ! wait_until_group_stops "$pgid"; then
      kill -KILL -- "-$pgid" 2>/dev/null || true
      wait_until_group_stops "$pgid" || true
    fi
  else
    kill -TERM "$pid" 2>/dev/null || true
    if ! wait_until_pids_stop "$pid"; then
      kill -KILL "$pid" 2>/dev/null || true
    fi
  fi
}

stopped_any=false

if [[ -f "$PID_FILE" ]]; then
  pid="$(tr -dc '0-9' < "$PID_FILE" || true)"
  if is_pid_running "$pid"; then
    stop_recorded_process_group "$pid"
    stopped_any=true
    echo "MyPort stopped: PID $pid"
  else
    echo "Removing stale PID file: ${PID_FILE#$APP_DIR/}"
  fi
  rm -f "$PID_FILE"
fi

mapfile -t port_pids < <(project_listener_pids_on_port)
if (( ${#port_pids[@]} > 0 )); then
  echo "Stopping remaining MyPort listener(s) on port $PORT: ${port_pids[*]}"
  kill -TERM "${port_pids[@]}" 2>/dev/null || true
  if ! wait_until_pids_stop "${port_pids[@]}"; then
    kill -KILL "${port_pids[@]}" 2>/dev/null || true
  fi
  stopped_any=true
fi

if [[ "$stopped_any" == false ]]; then
  echo "MyPort is not running."
fi

remaining="$(project_listener_pids_on_port | paste -sd ' ' -)"
if [[ -n "$remaining" ]]; then
  echo "MyPort still appears to be listening on port $PORT: $remaining" >&2
  exit 1
fi
