#!/usr/bin/env bash
# The deployed Worker's recent requests and log lines, newest first, one per line.
#
#   scripts/worker-logs.sh [minutes] [limit]      default: the last 30 minutes, 50 events
#   RAW=1 scripts/worker-logs.sh ...              the whole JSON answer instead
#
# Uses the cf CLI's own login. Each line: time, what ran (a request, an Agent's alarm or socket),
# its outcome, wall and CPU time in milliseconds, and the message of a log line.
set -euo pipefail

minutes="${1:-30}"
limit="${2:-50}"
worker="yogan-hockey"

cd "$(dirname "$0")/../apps/web"

to=$(date +%s%3N)
from=$((to - minutes * 60 * 1000))
# The timeframe goes in the body: cf 1.0.0-beta.12's --timeframe-from and --timeframe-to flags
# are not sent as the nested object the API wants, and the query is refused.
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

answer=$(pnpm exec cf observability telemetry query --body "$body" </dev/null)

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
