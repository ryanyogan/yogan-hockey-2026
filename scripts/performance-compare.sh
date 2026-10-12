#!/usr/bin/env bash
# Measures two checkouts side by side with scripts/measure-performance.ts and writes the
# comparison against the recorded baseline: docs/performance/results/cutover.md, with each
# site's own tables in cutover-main.* and cutover-branch.*.
#
#   PORT=<port> scripts/performance-compare.sh <checkout of main> [--only='/nhl,/players']
#
# This checkout is "the branch". Both are built with ESPN_FIXTURES=1 (SKIP_BUILD=1 measures the
# builds already there) and served as scripts/performance-baseline.sh serves one, on PORT to
# PORT+3, which must be free. The measuring script and the compressing proxy are this checkout's
# for both sites.
#
# The two sites are measured in turn, a route at a time, ROUNDS times (default 3), one run each:
# `main` (from its page cache and rendered, where it keeps the page), the branch with its ESPN
# reads in KV, and the branch restarted with KV emptied. So whatever else the machine is doing
# falls on both alike. About two hours. Every run is kept in node_modules/.tmp/performance-compare
# and none is dropped; RESUME=1 keeps the runs already there and measures only what is missing.
#
# After it, delete apps/web/.cloudflare/state in both checkouts before running Playwright.
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
cd "$root"
main=$(cd "${1:?usage: performance-compare.sh <checkout of main> [measure-performance.ts flags]}" && pwd)
shift
export TMPDIR="$root/node_modules/.tmp"
runs="$TMPDIR/performance-compare"
port=${PORT:-5173}
rounds=${ROUNDS:-3}
out=${OUT:-docs/performance/results/cutover}
only=""
for arg in "$@"; do
  case "$arg" in --only=*) only=${arg#--only=} ;; esac
done

[ -n "${RESUME:-}" ] || rm -rf "$runs"
mkdir -p "$runs" "$(dirname "$out")"
serve="$root/scripts/performance/serve-build.sh"
stop() {
  "$serve" stop "$main" "$port" || true
  "$serve" stop "$root" "$((port + 2))" || true
}
trap stop EXIT

if [ -z "${SKIP_BUILD:-}" ]; then
  for checkout in "$main" "$root"; do
    (cd "$checkout/apps/web" && ESPN_FIXTURES=1 pnpm build >"$TMPDIR/performance-build.log" 2>&1)
  done
fi
"$serve" start "$main" "$port" "$((port + 1))"
"$serve" start "$root" "$((port + 2))" "$((port + 3))"
at_main="http://localhost:$port"
at_branch="http://localhost:$((port + 2))"
node scripts/performance/prepare-fixtures.ts "$at_main" 401803652
node scripts/performance/prepare-fixtures.ts "$at_branch" 401803652

# Read once: a commit made in either checkout while the runs go on does not change what was built.
commit() { git -C "$1" log -1 --format='%h %s' | cut -c1-60; }
built_main=$(commit "$main")
built_branch=$(commit "$root")
mapfile -t routes < <(node -e '
  import("./scripts/performance/routes.ts").then(({ FIXTURE_SUBJECTS, measuredRoutes }) => {
    const only = process.argv[1];
    for (const { route } of measuredRoutes(FIXTURE_SUBJECTS))
      if (only === "" || only.split(",").includes(route)) console.log(route);
  });' "$only")
[ "${#routes[@]}" -gt 0 ] || { echo "--only=$only names no route" >&2; exit 1; }

# One run of one route. A run that fails is in its JSON's `failures` and in the report.
measure() {
  local name=$1 base=$2 route=$3
  shift 3
  [ -f "$runs/$name.json" ] && return 0
  node scripts/measure-performance.ts "$base" --runs=1 --only="$route" --out="$runs/$name" "$@" \
    2>>"$runs/log.txt" || echo "FAILED $name" >>"$runs/log.txt"
}

for round in $(seq "$rounds"); do
  for index in "${!routes[@]}"; do
    route=${routes[$index]}
    id=$(printf 'r%s-%02d' "$round" "$index")
    echo "$(date +%H:%M:%S) round $round: $route (load $(cut -d' ' -f1 /proc/loadavg))" | tee -a "$runs/log.txt" >&2
    measure "main-$id" "$at_main" "$route" --label="$built_main"
    measure "branch-$id-warm" "$at_branch" "$route" --kv=warm --label="$built_branch"
    if [ ! -f "$runs/branch-$id-cold.json" ]; then
      "$serve" restart-cold "$root" "$((port + 2))" "$((port + 3))"
      # The restarted Worker renders one page that reads nothing from ESPN, so that the run
      # measures an empty KV and not a Worker that has yet to render anything.
      curl -s -o /dev/null "$at_branch/no-such-page" || true
      measure "branch-$id-cold" "$at_branch" "$route" --kv=cold --label="$built_branch"
    fi
  done
done
node scripts/performance/compare-report.ts "$runs" "$out"
