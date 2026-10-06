#!/usr/bin/env bash
# Puts another version of the Worker live. The database is untouched: it only moves forward.
#
#   scripts/rollback.sh                 list the versions, newest first, and which is live
#   scripts/rollback.sh previous        the version uploaded before the live one
#   scripts/rollback.sh <version-id>    that version (also how to roll forward again)
#
# Uses the cf CLI's own login. cf 1.0.0-beta.12 has no `cf rollback`: a rollback is a new
# deployment that sends all traffic to an older version. It takes effect within seconds, and the
# next `cf deploy` (the next merge to main) replaces it.
set -euo pipefail

worker="yogan-hockey"
cd "$(dirname "$0")/../apps/web"

cf() { pnpm exec cf "$@" </dev/null; }

live=$(cf workers deployments list --worker "$worker" 2>/dev/null |
  jq -r '(.result? // .) | (.deployments? // .)[0].versions[0].version_id')
versions=$(cf workers versions list --worker-id "$worker" 2>/dev/null | jq -c '(.result? // .) | (.items? // .)')

target="${1:-}"
if [[ -z "$target" ]]; then
  jq -r --arg live "$live" '.[] | [
    (if .id == $live then "live" else "    " end),
    .id,
    ("#" + (.number | tostring)),
    .created_on,
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

echo "rollback: $live -> $target"
cf workers deployments create --worker "$worker" --strategy percentage \
  --versions "[{\"version_id\":\"$target\",\"percentage\":100}]"
