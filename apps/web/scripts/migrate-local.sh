#!/usr/bin/env bash
# Applies the D1 migrations to the local database.
#
# cf 1.0.0-beta.12 applies them and then fails to exit about half the time, so each attempt is
# given a time limit and retried. Applying is idempotent. Drop the loop once cf exits reliably.
set -uo pipefail

for attempt in 1 2 3 4 5 6; do
  if timeout 10 cf d1 migrations apply 00000000-0000-4000-8000-000000000031 \
    --local --persist-to .cloudflare/state --dir ../../packages/db/migrations </dev/null; then
    exit 0
  fi
  echo "migrate-local: attempt $attempt did not exit cleanly, retrying" >&2
done

echo "migrate-local: gave up after 6 attempts" >&2
exit 1
