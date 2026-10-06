#!/usr/bin/env bash
# Retakes docs/design/team-marks/: each place a team's mark is drawn, at 1440 and 390, in both
# themes. Usage: scripts/team-marks-shots.sh http://localhost:<PORT>   (a fixture-mode dev server)
set -euo pipefail
cd "$(dirname "$0")/.."
BASE=${1:?the dev server\'s address}
OUT=docs/design/team-marks
mkdir -p "$OUT"

shot() { # name path height
  for width in 1440 390; do
    for scheme in light dark; do
      node scripts/screenshot.mjs "$BASE$2" "$OUT/$1-$width-$scheme.png" "$width" "$scheme" "$3"
    done
  done
}

shot dashboard /skeleton/dashboard 1100
shot standings /nhl 900
shot teams "/nhl?tab=teams" 700
shot live /skeleton/live 900
shot team /nhl/teams/21 900
shot game /nhl/games/401892449 700
shot player /players/4024123 500
shot search "/players?q=mar" 600
