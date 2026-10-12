#!/usr/bin/env bash
# Measures every route against the performance budgets and writes docs/performance/results/.
#
#   scripts/performance-baseline.sh local      a production build of this checkout on fixture data
#   scripts/performance-baseline.sh deployed   https://hockey.yogan.dev as it stands (reads only)
#
# Anything after the target goes to scripts/measure-performance.ts: --runs=1 --only=/players
# for a quick look at one route, --out=<path> to keep the committed results as they are.
#
# local: builds with ESPN_FIXTURES=1, serves the build with `vite preview` on PORT+10000, puts
# the compressing proxy in front of it on PORT (default 5173; both must be free), migrates the local database the
# build reads, seeds the sample picks, measures, and stops both servers. About 50 minutes at the
# default three runs. Run it on a machine doing nothing else: the CPU is slowed, not isolated.
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
cd "$root"
export TMPDIR="$root/node_modules/.tmp"
mkdir -p "$TMPDIR" docs/performance/results

target=${1:-local}
shift || true

if [ "$target" = "deployed" ]; then
  # 401803652 is a finished game of April 2026 that production has archived; the game still to
  # be played is whichever the live page lists first, and is left out on a day without one.
  # First, with no throttling: what a cached and a rendered answer cost before a phone's network.
  # Written whole or not at all: a failed run leaves the committed table as it was.
  bash scripts/performance/deployed-first-byte.sh >"$TMPDIR/deployed-first-byte.md"
  mv "$TMPDIR/deployed-first-byte.md" docs/performance/results/deployed-first-byte.md
  exec node scripts/measure-performance.ts https://hockey.yogan.dev \
    --out=docs/performance/results/deployed --scheduled-game=auto "$@"
fi
if [ "$target" != "local" ]; then
  echo "usage: performance-baseline.sh local|deployed [measure-performance.ts flags]" >&2
  exit 1
fi

port=${PORT:-5173}
inner=$((port + 10000))
# Another worktree's server may be on either port, so nothing is killed by port: a port in use
# stops the run, and only the two servers started here are stopped at the end.
for taken in "$port" "$inner"; do
  if fuser -n tcp "$taken" >/dev/null 2>&1; then
    echo "port $taken is in use: give a free one, PORT=<port> (the build is served on PORT+10000)" >&2
    exit 1
  fi
done
preview=""
proxy=""
stop() {
  # The preview is pnpm, vite and workerd: its own session, so one signal reaches all three.
  [ -z "$preview" ] || kill -- "-$preview" 2>/dev/null || true
  [ -z "$proxy" ] || kill "$proxy" 2>/dev/null || true
}
trap stop EXIT

cd apps/web
ESPN_FIXTURES=1 pnpm build >"$TMPDIR/performance-build.log" 2>&1
# A build reads the database by production's id, in the local simulated store: `--local` is what
# keeps this off Cloudflare. cf often applies and then fails to exit (see the build notes), so it
# gets a time limit; prepare-fixtures.ts fails below if the tables are not there.
d1=$(node -p 'require("./cloudflare.resources.json").production.d1')
timeout 30 pnpm exec cf d1 migrations apply "$d1" --local --persist-to .cloudflare/state \
  --dir ../../packages/db/migrations </dev/null >"$TMPDIR/performance-migrate.log" 2>&1 || true
ESPN_FIXTURES=1 setsid pnpm exec vite preview --port "$inner" --strictPort \
  >"$TMPDIR/performance-preview.log" 2>&1 &
preview=$!
cd "$root"
node scripts/performance/compressing-proxy.ts "$port" "$inner" &
proxy=$!

up=""
for _ in $(seq 60); do
  if curl -sf -o /dev/null "http://localhost:$port/nhl"; then
    up=yes
    break
  fi
  sleep 1
done
if [ -z "$up" ]; then
  echo "the build never answered on $port: see $TMPDIR/performance-preview.log" >&2
  exit 1
fi
# The sample picks and the archived game are for routes the port to TanStack Start has not reached
# (#189 the game, #192 the sample pages): until `/skeleton/picks` is back there is nothing to
# prepare, and only the routes that exist can be measured (--only='/nhl,/nhl?tab=teams').
if curl -sf -o /dev/null "http://localhost:$port/skeleton/picks"; then
  node scripts/performance/prepare-fixtures.ts "http://localhost:$port" 401803652
else
  echo "no /skeleton/picks on this build: fixtures not prepared, measure only the routes it has" >&2
fi
node scripts/measure-performance.ts "http://localhost:$port" \
  --out=docs/performance/results/local "$@"
