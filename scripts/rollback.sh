#!/usr/bin/env bash
# Puts another version of the Worker live. The database is untouched: it only moves forward.
#
#   scripts/rollback.sh                           list the versions, newest first, and which is live
#   scripts/rollback.sh previous                  the version uploaded before the live one
#   scripts/rollback.sh <version-id>              that version (also how to roll forward again)
#   scripts/rollback.sh --dry-run previous|<id>   say what would go live, and change nothing
#
# Uses wrangler's own login. `wrangler rollback` makes a new deployment that sends all traffic to
# the version named. It takes effect within seconds, and the next `wrangler deploy` (the next
# merge to main) replaces it. WORKER names another Worker, to try this away from production.
set -euo pipefail

worker="${WORKER:-yogan-hockey}"
cd "$(dirname "$0")/../apps/web"

dry=""
if [[ "${1:-}" == "--dry-run" ]]; then
  dry=1
  shift
fi

wrangler() { pnpm exec wrangler "$@" </dev/null; }

# Both lists come oldest first. The live version is the newest deployment's.
live=$(wrangler deployments list --name "$worker" --json | jq -r 'max_by(.created_on).versions[0].version_id')
versions=$(wrangler versions list --name "$worker" --json)

target="${1:-}"
if [[ -z "$target" ]]; then
  jq -r --arg live "$live" 'sort_by(.number) | reverse | .[] | [
    (if .id == $live then "live" else "    " end),
    .id,
    ("#" + (.number | tostring)),
    .metadata.created_on,
    (.annotations["workers/tag"] // "-"),
    (.annotations["workers/message"] // "")
  ] | join("  ")' <<<"$versions"
  exit 0
fi

if [[ "$target" == "previous" ]]; then
  target=$(jq -r --arg live "$live" '
    (map(select(.id == $live))[0].number) as $n | map(select(.number < $n)) | max_by(.number) | .id // empty
  ' <<<"$versions")
  [[ -n "$target" ]] || { echo "rollback: no version older than the live one ($live)" >&2 && exit 1; }
fi

if [[ "$target" == "$live" ]]; then
  echo "rollback: $target is already live"
  exit 0
fi

describe() {
  jq -r --arg id "$1" 'map(select(.id == $id))[0] // {} |
    "#\(.number // "?")  \(.annotations["workers/tag"] // "-")  \(.annotations["workers/message"] // "")"' <<<"$versions"
}
jq -e --arg id "$target" 'any(.[]; .id == $id)' <<<"$versions" >/dev/null ||
  { echo "rollback: $worker has no version $target (it lists the newest only; wrangler will say if it is real)" >&2; }

echo "rollback: $worker"
echo "  live    $live  $(describe "$live")"
echo "  target  $target  $(describe "$target")"
message="Rolled back by scripts/rollback.sh from ${live:0:8}"
if [[ -n "$dry" ]]; then
  echo "rollback: dry run, nothing changed. It would run, in apps/web:"
  echo "  pnpm exec wrangler rollback $target --name $worker --message \"$message\" --yes"
  exit 0
fi

wrangler rollback "$target" --name "$worker" --message "$message" --yes
