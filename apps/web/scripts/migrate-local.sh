#!/usr/bin/env bash
# Applies the D1 migrations to the local database.
#
# cf 1.0.0-beta.12 applies them, prints its result, and then often fails to exit: about half the
# time on a laptop, every time on a GitHub runner. So each attempt gets a time limit, and an
# attempt that printed its result before the limit counts as done. Applying is idempotent.
# Drop all of this once cf exits reliably.
set -uo pipefail

out=$(mktemp)
trap 'rm -f "$out"' EXIT

for attempt in 1 2 3 4 5 6; do
  timeout 20 cf d1 migrations apply 00000000-0000-4000-8000-000000000031 \
    --local --persist-to .cloudflare/state --dir ../../packages/db/migrations </dev/null >"$out" 2>&1
  status=$?
  cat "$out"
  if [ "$status" -eq 0 ]; then
    exit 0
  fi
  # The result is a JSON array, printed last: "[]" when there was nothing to apply, otherwise a
  # list closed by "]". A failed migration is marked with a cross.
  last=$(grep -v '^[[:space:]]*$' "$out" | tail -n 1)
  if [ "$status" -eq 124 ] && { [ "$last" = "[]" ] || [ "$last" = "]" ]; } && ! grep -q '❌' "$out"; then
    echo "migrate-local: applied; cf did not exit, so it was stopped" >&2
    exit 0
  fi
  echo "migrate-local: attempt $attempt did not finish (exit $status), retrying" >&2
done

echo "migrate-local: gave up after 6 attempts" >&2
exit 1
