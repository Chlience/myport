#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${MYPORT_LOG_DIR:-$APP_DIR/logs}"
LOG_FILE="${MYPORT_LOG_FILE:-$LOG_DIR/myport-$(date +%F).log}"
LINES="${MYPORT_LOG_LINES:-120}"

if [[ ! -f "$LOG_FILE" ]]; then
  echo "Log file not found: ${LOG_FILE#$APP_DIR/}" >&2
  exit 1
fi

tail -n "$LINES" -f "$LOG_FILE"
