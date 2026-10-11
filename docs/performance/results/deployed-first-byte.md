| Route | As asked for | Rendered (`?uncached=`) |
| --- | --- | --- |
| `/` | 306 ms (none x7) | 280 ms (none x7) |
| `/nhl` | 82 ms (hit x7) | 181 ms (bypass x7) |
| `/nhl?tab=teams` | 76 ms (hit x7) | 190 ms (bypass x7) |
| `/nhl/live` | 94 ms (none x7) | 124 ms (none x7) |
| `/nhl/teams/21` | 88 ms (hit x6, miss x1) | 369 ms (bypass x7) |
| `/nhl/teams/21/roster` | 71 ms (hit x7) | 205 ms (bypass x7) |
| `/nhl/teams/21/stats` | 92 ms (hit x7) | 198 ms (bypass x7) |
| `/nhl/games/401803652` | 69 ms (hit x3, stale x4) | 263 ms (bypass x7) |
| `/nhl/games/401803652/scoring` | 119 ms (hit x6, stale x1) | 228 ms (bypass x7) |
| `/nhl/games/401803652/pick` | 79 ms (hit x6, stale x1) | 286 ms (bypass x7) |
| `/players` | 75 ms (hit x7) | 83 ms (bypass x7) |
| `/players?q=mar` | 120 ms (bypass x7) | 112 ms (bypass x7) |
| `/players/4024123` | 81 ms (hit x7) | 171 ms (bypass x7) |
| `/players/4024123/games` | 79 ms (hit x6, miss x1) | 190 ms (bypass x7) |
| `/players/3067313` | 99 ms (hit x7) | 206 ms (bypass x7) |
