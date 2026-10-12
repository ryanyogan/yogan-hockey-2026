#!/usr/bin/env bash
# Serves a checkout's fixture build as scripts/performance-baseline.sh does, and leaves it up: the
# build under `vite preview` on <inner-port>, this checkout's compressing proxy in front of it on
# <port>. For measuring two checkouts side by side (scripts/performance-compare.sh), where each
# site must stay up while the other is measured.
#
#   serve-build.sh start <checkout> <port> <inner-port>   build first: ESPN_FIXTURES=1 pnpm build
#   serve-build.sh stop <checkout> <port>
#   serve-build.sh restart-cold <checkout> <port> <inner-port>
#
# The proxy is this checkout's whichever site it fronts, so both are compressed alike.
# restart-cold stops the site, deletes what its KV namespaces hold (for TanStack Start: every ESPN
# read cachified kept, so the next request reads each afresh) and starts it again. The Agents'
# state and D1 are left: the archived game and the sample picks stay.
set -euo pipefail

here=$(cd "$(dirname "$0")/../.." && pwd)
action=${1:-}
checkout=$(cd "${2:?usage: serve-build.sh start|stop|restart-cold <checkout> <port> [inner-port]}" && pwd)
port=${3:?a port}
tmp="$checkout/node_modules/.tmp"
pids="$tmp/performance-serve-$port.pids"
mkdir -p "$tmp"
export TMPDIR="$tmp"

stop() {
  [ -f "$pids" ] || return 0
  read -r preview proxy <"$pids"
  # The preview is pnpm, vite and workerd: its own session, so one signal reaches all three.
  kill -- "-$preview" 2>/dev/null || true
  kill "$proxy" 2>/dev/null || true
  rm -f "$pids"
  for _ in $(seq 40); do
    fuser -n tcp "$port" >/dev/null 2>&1 || return 0
    sleep 0.25
  done
}

start() {
  local inner=${1:?an inner port}
  for taken in "$port" "$inner"; do
    if fuser -n tcp "$taken" >/dev/null 2>&1; then
      echo "port $taken is in use" >&2
      exit 1
    fi
  done
  cd "$checkout/apps/web"
  # A build reads the database by production's id, in the local simulated store: `--local` is
  # what keeps this off Cloudflare. cf often applies and then fails to exit, so it gets a limit.
  d1=$(node -p 'require("./cloudflare.resources.json").production.d1')
  timeout 30 pnpm exec cf d1 migrations apply "$d1" --local --persist-to .cloudflare/state \
    --dir ../../packages/db/migrations </dev/null >"$tmp/performance-migrate-$port.log" 2>&1 || true
  ESPN_FIXTURES=1 setsid pnpm exec vite preview --port "$inner" --strictPort \
    >"$tmp/performance-preview-$port.log" 2>&1 &
  local preview=$!
  cd "$here"
  node scripts/performance/compressing-proxy.ts "$port" "$inner" 2>>"$tmp/performance-preview-$port.log" &
  local proxy=$!
  echo "$preview $proxy" >"$pids"
  for _ in $(seq 60); do
    # A file of the site's that reads nothing: asking for a page would put its reads in KV.
    if curl -sf -o /dev/null "http://localhost:$port/manifest.webmanifest"; then
      return 0
    fi
    sleep 1
  done
  echo "the build never answered on $port: see $tmp/performance-preview-$port.log" >&2
  stop
  exit 1
}

case "$action" in
  start) start "${4:-}" ;;
  stop) stop ;;
  restart-cold)
    stop
    rm -rf "$checkout/apps/web/.cloudflare/state/v3/kv"
    start "${4:-}"
    ;;
  *)
    echo "usage: serve-build.sh start|stop|restart-cold <checkout> <port> [inner-port]" >&2
    exit 1
    ;;
esac
