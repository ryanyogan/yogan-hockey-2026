#!/usr/bin/env bash
# The deployed Worker's recent requests and log lines, newest first, one per line.
#
#   scripts/worker-logs.sh [minutes] [limit]      default: the last 30 minutes, 50 events
#   RAW=1 scripts/worker-logs.sh ...              the whole JSON answer instead
#   scripts/worker-logs.sh --tail [wrangler tail's flags]
#                                                 what the Worker does from now on, as it happens
#
# `wrangler tail` (wrangler's own login) shows only what happens while it runs. The stored logs
# come from an API wrangler has no command for and its login has no scope for: they need
# CLOUDFLARE_API_TOKEN set to a token with Account > Workers Observability > Read. Each line:
# time, what ran (a request, an Agent's alarm or socket), its outcome, wall and CPU time in
# milliseconds, and the message of a log line.
set -euo pipefail

worker="yogan-hockey"
root="$(cd "$(dirname "$0")" && pwd)"

if [[ "${1:-}" == "--tail" ]]; then
  shift
  cd "$root/../apps/web"
  exec pnpm exec wrangler tail "$worker" "$@"
fi

# shellcheck source=scripts/lib/cloudflare-api.sh
source "$root/lib/cloudflare-api.sh"

minutes="${1:-30}"
limit="${2:-50}"

to=$(date +%s%3N)
from=$((to - minutes * 60 * 1000))
body=$(jq -n --arg worker "$worker" --argjson from "$from" --argjson to "$to" --argjson limit "$limit" '{
  queryId: "adhoc",
  dry: true,
  view: "events",
  limit: $limit,
  timeframe: {from: $from, to: $to},
  parameters: {
    datasets: ["cloudflare-workers"],
    filters: [{key: "$metadata.service", operation: "eq", type: "string", value: $worker}]
  }
}')

account=$(cloudflare_account)
answer=$(cloudflare_api POST "/accounts/$account/workers/observability/telemetry/query" "$body") || {
  # Seen on 2026-10-12: wrangler's login is refused here (403), where cf's was not.
  echo "worker-logs: Cloudflare refused the query. wrangler's own login has no scope for the stored" >&2
  echo "  logs: set CLOUDFLARE_API_TOKEN to a token with Account > Workers Observability > Read," >&2
  echo "  or watch the Worker live with: scripts/worker-logs.sh --tail" >&2
  exit 1
}

if [[ -n "${RAW:-}" ]]; then
  echo "$answer"
  exit 0
fi

jq -r '
  (.result? // .) | (.events.events // [])[] |
  [
    (.timestamp / 1000 | todate),
    (."$workers".eventType // "-"),
    (."$workers".entrypoint // "-"),
    (."$metadata".trigger // ."$metadata".message // "-"),
    (."$workers".outcome // "-"),
    ("wall=" + ((."$workers".wallTimeMs // "-") | tostring)),
    ("cpu=" + ((."$workers".cpuTimeMs // "-") | tostring)),
    (."$metadata".error // "")
  ] | join("  ")
' <<<"$answer"
