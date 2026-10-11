#!/usr/bin/env bash
# The deployed site's own time to first byte, cached against rendered, with no throttling: what
# the Worker and the real network cost before a phone's connection is added. GET requests only.
#
#   scripts/performance/deployed-first-byte.sh [base] [requests a route]
#
# Prints, per route: the page-cache status of each answer, then the median milliseconds from the
# end of the TLS handshake to the first byte, asked for as the page is (cached once warm) and
# with `?uncached=<n>` (rendered: a parameter no page reads bypasses the cache).
set -euo pipefail
base=${1:-https://hockey.yogan.dev}
count=${2:-7}

first_byte() {
  curl -s -o /dev/null -H 'accept-encoding: gzip, br' \
    -w '%{time_appconnect} %{time_starttransfer} %header{x-page-cache}\n' "$1"
}
median() {
  sort -n | awk '{ value[NR] = $1 } END { print value[int((NR + 1) / 2)] }'
}
measure() {
  local route=$1 suffix=$2 lines="" join="?"
  case "$route" in *\?*) join="&" ;; esac
  for n in $(seq "$count"); do
    lines+="$(first_byte "$base$route${suffix:+$join$suffix$n}")"$'\n'
  done
  local status ms
  status=$(printf '%s' "$lines" | awk '{ print ($3 == "" ? "none" : $3) }' | sort | uniq -c | awk '{ printf "%s%s x%s", (NR > 1 ? ", " : ""), $2, $1 }')
  ms=$(printf '%s' "$lines" | awk '{ printf "%d\n", ($2 - $1) * 1000 }' | median)
  printf '%s ms (%s)' "$ms" "$status"
}

printf '| Route | As asked for | Rendered (`?uncached=`) |\n| --- | --- | --- |\n'
for route in / /nhl '/nhl?tab=teams' /nhl/live /nhl/teams/21 /nhl/teams/21/roster \
  /nhl/teams/21/stats /nhl/games/401803652 /nhl/games/401803652/scoring \
  /nhl/games/401803652/pick /players '/players?q=mar' /players/4024123 \
  /players/4024123/games /players/3067313; do
  first_byte "$base$route" >/dev/null # once, so the next answers can come from the cache
  printf '| `%s` | %s | %s |\n' "$route" "$(measure "$route" "")" "$(measure "$route" "uncached=")"
done
