#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ ! -x "$APP_DIR/stop-myport.sh" || ! -x "$APP_DIR/start-myport.sh" ]]; then
  echo "Missing executable start/stop helper scripts." >&2
  exit 1
fi

echo "Building MyPort..."
(cd "$APP_DIR" && npm run build)

echo "Restarting MyPort..."
"$APP_DIR/stop-myport.sh"
MYPORT_SKIP_BUILD=true "$APP_DIR/start-myport.sh"
