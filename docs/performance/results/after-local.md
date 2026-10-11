<!-- Written by scripts/measure-performance.ts. Do not edit: measure again. -->

Measured 2026-10-11T22:37:14.893Z against `http://localhost:5331`, 3 runs a route, on Intel(R) Core(TM) i7-7700 CPU @ 3.60GHz x 8, linux.

## Every route against every budget

| Route | Page | First paint ms | Largest paint ms (budget) | Shift on load | Shift as scores arrive | Slowest tap ms | Next shell ms | Blank frames | View transition | Script gzip kB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | rendered (none) | 820 | 820 (2500) | 0.0000 | 0.0000 | 80 (open the whole slate) | 76 | 0 | yes | 194.6 |
| `/nhl` | cached (hit) | 828 | 828 (1500) | 0.0000 | 0.0000 | 104 (open the whole slate) | 148 | 0 | yes | 187.8 |
| `/nhl` | rendered (bypass) | 832 | 832 (2500) | 0.0000 | 0.0000 | 104 (open the whole slate) | 117 | 0 | yes | 187.8 |
| `/nhl?tab=teams` | cached (hit) | 820 | 820 (1500) | 0.0000 | 0.0000 | 96 (open the whole slate) | 126 | 0 | yes | 187.8 |
| `/nhl?tab=teams` | rendered (bypass) | 812 | 812 (2500) | 0.0000 | 0.0000 | 112 (open the whole slate) | 179 | 0 | yes | 187.8 |
| `/nhl/live` | rendered (none) | 828 | 828 (2500) | 0.0000 | **0.1506** ✗ | 72 (open the whole slate) | 83 | 0 | yes | 189.9 |
| `/nhl/teams/21` | cached (hit, stale) | 868 | 868 (1500) | 0.0000 | 0.0000 | 112 (theme toggle) | 105 | 0 | yes | 191.3 |
| `/nhl/teams/21` | rendered (bypass) | 856 | 856 (2500) | 0.0000 | 0.0000 | 104 (theme toggle) | 109 | 0 | yes | 191.3 |
| `/nhl/teams/21/roster` | cached (hit, stale) | 804 | 804 (1500) | 0.0000 | 0.0000 | 88 (open the whole slate) | 75 | 0 | yes | 191.3 |
| `/nhl/teams/21/roster` | rendered (bypass) | 820 | 820 (2500) | 0.0000 | 0.0000 | 88 (open the whole slate) | 93 | 0 | yes | 191.3 |
| `/nhl/teams/21/stats` | cached (hit, stale) | 808 | 808 (1500) | 0.0000 | 0.0000 | 96 (open the whole slate) | 83 | 0 | yes | 191.3 |
| `/nhl/teams/21/stats` | rendered (bypass) | 792 | 792 (2500) | 0.0000 | 0.0000 | 88 (open the whole slate) | 89 | 0 | yes | 191.3 |
| `/nhl/games/401803652` | cached (stale, hit) | 852 | 852 (1500) | 0.0000 | 0.0000 | 88 (theme toggle) | 71 | 0 | yes | 246.0 |
| `/nhl/games/401803652` | rendered (bypass) | 848 | 848 (2500) | 0.0000 | 0.0000 | 88 (theme toggle) | 78 | 0 | yes | 246.0 |
| `/nhl/games/401803652/scoring` | cached (hit) | 824 | 824 (1500) | 0.0000 | 0.0000 | 80 (theme toggle) | 89 | 0 | yes | 246.0 |
| `/nhl/games/401803652/scoring` | rendered (bypass) | 900 | 900 (2500) | 0.0000 | 0.0000 | 144 (open the whole slate) | 106 | 0 | yes | 246.0 |
| `/nhl/games/401803652/pick` | cached (hit) | 824 | 824 (1500) | 0.0000 | 0.0000 | 88 (theme toggle) | 80 | 0 | yes | 246.0 |
| `/nhl/games/401803652/pick` | rendered (bypass) | 828 | 828 (2500) | 0.0000 | 0.0000 | 104 (open the whole slate) | 103 | 0 | yes | 246.0 |
| `/nhl/games/401892449` | rendered (miss) | 812 | 812 (2500) | 0.0000 | 0.0000 | 72 (open the whole slate) | 111 | 0 | yes | 246.0 |
| `/players` | cached (hit, stale) | 776 | 776 (1500) | 0.0000 | 0.0000 | 88 (open the whole slate) | 82 | 0 | yes | 194.0 |
| `/players` | rendered (bypass) | 788 | 788 (2500) | 0.0000 | 0.0000 | 80 (open the whole slate) | 85 | 0 | yes | 194.0 |
| `/players?q=mar` | rendered (bypass) | 800 | 800 (2500) | 0.0000 | 0.0000 | 72 (open the whole slate) | 71 | 0 | yes | 194.0 |
| `/players/4024123` | cached (hit) | 800 | 800 (1500) | 0.0000 | 0.0000 | 72 (theme toggle) | 105 | 0 | yes | 188.5 |
| `/players/4024123` | rendered (bypass) | 796 | 796 (2500) | 0.0000 | 0.0000 | 72 (theme toggle) | 112 | 0 | yes | 188.5 |
| `/players/4024123/games` | cached (hit) | 808 | 808 (1500) | 0.0000 | 0.0000 | 120 (open the whole slate) | 73 | 0 | yes | 188.5 |
| `/players/4024123/games` | rendered (bypass) | 808 | 808 (2500) | 0.0000 | 0.0000 | 80 (open the whole slate) | 78 | 0 | yes | 188.5 |
| `/players/3067313` | cached (hit) | 796 | 796 (1500) | 0.0000 | 0.0000 | 72 (open the whole slate) | 110 | 0 | yes | 188.5 |
| `/players/3067313` | rendered (bypass) | 796 | 796 (2500) | 0.0000 | 0.0000 | 80 (open the whole slate) | 106 | 0 | yes | 188.5 |

## What each route sends

| Route | Script files | Script kB | Script gzip kB | **Script budget, gzip kB** | Document kB | Document gzip kB | Stylesheet gzip kB |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 37 | 633.2 | 194.6 | **197** | 194.9 | 25.7 | 9.8 |
| `/nhl` | 28 | 619.1 | 187.8 | **190** | 225.4 | 24.9 | 9.8 |
| `/nhl?tab=teams` | 28 | 619.1 | 187.8 | **190** | 151.6 | 22.5 | 9.8 |
| `/nhl/live` | 31 | 624.0 | 189.9 | **192** | 201.7 | 24.3 | 9.8 |
| `/nhl/teams/21` | 33 | 626.8 | 191.3 | **194** | 440.6 | 34.6 | 9.8 |
| `/nhl/teams/21/roster` | 33 | 626.8 | 191.3 | **194** | 202.3 | 24.1 | 9.8 |
| `/nhl/teams/21/stats` | 33 | 626.8 | 191.3 | **194** | 134.3 | 20.9 | 9.8 |
| `/nhl/games/401803652` | 31 | 817.4 | 246.0 | **248** | 372.7 | 41.2 | 9.8 |
| `/nhl/games/401803652/scoring` | 31 | 817.4 | 246.0 | **248** | 346.8 | 40.0 | 9.8 |
| `/nhl/games/401803652/pick` | 31 | 817.4 | 246.0 | **248** | 342.7 | 40.1 | 9.8 |
| `/nhl/games/401892449` | 31 | 817.4 | 246.0 | **248** | 172.3 | 25.3 | 9.8 |
| `/players` | 34 | 632.2 | 194.0 | **196** | 83.5 | 16.3 | 9.8 |
| `/players?q=mar` | 34 | 632.2 | 194.0 | **196** | 106.2 | 19.2 | 9.8 |
| `/players/4024123` | 29 | 620.3 | 188.5 | **191** | 190.2 | 24.1 | 9.8 |
| `/players/4024123/games` | 29 | 620.3 | 188.5 | **191** | 190.5 | 24.2 | 9.8 |
| `/players/3067313` | 29 | 620.3 | 188.5 | **191** | 177.9 | 23.7 | 9.8 |

## Detail

### Every tap

| Route | Page | Tap | ms to next paint |
| --- | --- | --- | --- |
| `/` | rendered | theme toggle | 72 |
| `/` | rendered | open the whole slate | 80 |
| `/` | rendered | open the menu | 32 |
| `/nhl` | cached | theme toggle | 88 |
| `/nhl` | cached | open the whole slate | 104 |
| `/nhl` | cached | open the menu | 40 |
| `/nhl` | rendered | theme toggle | 88 |
| `/nhl` | rendered | open the whole slate | 104 |
| `/nhl` | rendered | open the menu | 32 |
| `/nhl?tab=teams` | cached | theme toggle | 64 |
| `/nhl?tab=teams` | cached | open the whole slate | 96 |
| `/nhl?tab=teams` | cached | open the menu | 32 |
| `/nhl?tab=teams` | rendered | theme toggle | 72 |
| `/nhl?tab=teams` | rendered | open the whole slate | 112 |
| `/nhl?tab=teams` | rendered | open the menu | 32 |
| `/nhl/live` | rendered | theme toggle | 56 |
| `/nhl/live` | rendered | open the whole slate | 72 |
| `/nhl/live` | rendered | open the menu | 40 |
| `/nhl/teams/21` | cached | theme toggle | 112 |
| `/nhl/teams/21` | cached | open the whole slate | 112 |
| `/nhl/teams/21` | cached | favorite heart | 64 |
| `/nhl/teams/21` | cached | open the menu | 40 |
| `/nhl/teams/21` | rendered | theme toggle | 104 |
| `/nhl/teams/21` | rendered | open the whole slate | 96 |
| `/nhl/teams/21` | rendered | favorite heart | 56 |
| `/nhl/teams/21` | rendered | open the menu | 32 |
| `/nhl/teams/21/roster` | cached | theme toggle | 72 |
| `/nhl/teams/21/roster` | cached | open the whole slate | 88 |
| `/nhl/teams/21/roster` | cached | favorite heart | 56 |
| `/nhl/teams/21/roster` | cached | open the menu | 32 |
| `/nhl/teams/21/roster` | rendered | theme toggle | 72 |
| `/nhl/teams/21/roster` | rendered | open the whole slate | 88 |
| `/nhl/teams/21/roster` | rendered | favorite heart | 72 |
| `/nhl/teams/21/roster` | rendered | open the menu | 40 |
| `/nhl/teams/21/stats` | cached | theme toggle | 64 |
| `/nhl/teams/21/stats` | cached | open the whole slate | 96 |
| `/nhl/teams/21/stats` | cached | favorite heart | 56 |
| `/nhl/teams/21/stats` | cached | open the menu | 32 |
| `/nhl/teams/21/stats` | rendered | theme toggle | 64 |
| `/nhl/teams/21/stats` | rendered | open the whole slate | 88 |
| `/nhl/teams/21/stats` | rendered | favorite heart | 72 |
| `/nhl/teams/21/stats` | rendered | open the menu | 32 |
| `/nhl/games/401803652` | cached | theme toggle | 88 |
| `/nhl/games/401803652` | cached | open the whole slate | 88 |
| `/nhl/games/401803652` | cached | select a goal on the timeline | 80 |
| `/nhl/games/401803652` | cached | open the menu | 56 |
| `/nhl/games/401803652` | rendered | theme toggle | 88 |
| `/nhl/games/401803652` | rendered | open the whole slate | 80 |
| `/nhl/games/401803652` | rendered | select a goal on the timeline | 80 |
| `/nhl/games/401803652` | rendered | open the menu | 56 |
| `/nhl/games/401803652/scoring` | cached | theme toggle | 80 |
| `/nhl/games/401803652/scoring` | cached | open the whole slate | 80 |
| `/nhl/games/401803652/scoring` | cached | select a goal on the timeline | 72 |
| `/nhl/games/401803652/scoring` | cached | open the menu | 56 |
| `/nhl/games/401803652/scoring` | rendered | theme toggle | 88 |
| `/nhl/games/401803652/scoring` | rendered | open the whole slate | 144 |
| `/nhl/games/401803652/scoring` | rendered | select a goal on the timeline | 104 |
| `/nhl/games/401803652/scoring` | rendered | open the menu | 72 |
| `/nhl/games/401803652/pick` | cached | theme toggle | 88 |
| `/nhl/games/401803652/pick` | cached | open the whole slate | 72 |
| `/nhl/games/401803652/pick` | cached | select a goal on the timeline | 72 |
| `/nhl/games/401803652/pick` | cached | open the menu | 56 |
| `/nhl/games/401803652/pick` | rendered | theme toggle | 72 |
| `/nhl/games/401803652/pick` | rendered | open the whole slate | 104 |
| `/nhl/games/401803652/pick` | rendered | select a goal on the timeline | 72 |
| `/nhl/games/401803652/pick` | rendered | open the menu | 56 |
| `/nhl/games/401892449` | rendered | theme toggle | 64 |
| `/nhl/games/401892449` | rendered | open the whole slate | 72 |
| `/nhl/games/401892449` | rendered | open the menu | 32 |
| `/players` | cached | theme toggle | 48 |
| `/players` | cached | open the whole slate | 88 |
| `/players` | cached | type in the search | 24 |
| `/players` | cached | open the menu | 32 |
| `/players` | rendered | theme toggle | 48 |
| `/players` | rendered | open the whole slate | 80 |
| `/players` | rendered | type in the search | 16 |
| `/players` | rendered | open the menu | 32 |
| `/players?q=mar` | rendered | theme toggle | 56 |
| `/players?q=mar` | rendered | open the whole slate | 72 |
| `/players?q=mar` | rendered | favorite heart | 32 |
| `/players?q=mar` | rendered | open the menu | 32 |
| `/players/4024123` | cached | theme toggle | 72 |
| `/players/4024123` | cached | open the whole slate | 72 |
| `/players/4024123` | cached | favorite heart | 32 |
| `/players/4024123` | cached | open the menu | 32 |
| `/players/4024123` | rendered | theme toggle | 72 |
| `/players/4024123` | rendered | open the whole slate | 72 |
| `/players/4024123` | rendered | favorite heart | 32 |
| `/players/4024123` | rendered | open the menu | 40 |
| `/players/4024123/games` | cached | theme toggle | 64 |
| `/players/4024123/games` | cached | open the whole slate | 120 |
| `/players/4024123/games` | cached | favorite heart | 32 |
| `/players/4024123/games` | cached | open the menu | 40 |
| `/players/4024123/games` | rendered | theme toggle | 64 |
| `/players/4024123/games` | rendered | open the whole slate | 80 |
| `/players/4024123/games` | rendered | favorite heart | 32 |
| `/players/4024123/games` | rendered | open the menu | 32 |
| `/players/3067313` | cached | theme toggle | 64 |
| `/players/3067313` | cached | open the whole slate | 72 |
| `/players/3067313` | cached | favorite heart | 32 |
| `/players/3067313` | cached | open the menu | 32 |
| `/players/3067313` | rendered | theme toggle | 64 |
| `/players/3067313` | rendered | open the whole slate | 80 |
| `/players/3067313` | rendered | favorite heart | 32 |
| `/players/3067313` | rendered | open the menu | 32 |

### Every navigation

| From | Page | To | Shell ms | Content ms | Blank frames | Requests after the tap | Whole document loaded |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | rendered | `/nhl/games/401891815` | 76 | 724 | 0 | 1 | no |
| `/nhl` | cached | `/nhl/teams/14` | 148 | 998 | 0 | 1 | no |
| `/nhl` | rendered | `/nhl/teams/14` | 117 | 922 | 0 | 1 | no |
| `/nhl?tab=teams` | cached | `/nhl/teams/25` | 126 | 1040 | 0 | 1 | no |
| `/nhl?tab=teams` | rendered | `/nhl/teams/25` | 179 | 1029 | 0 | 1 | no |
| `/nhl/live` | rendered | `/nhl/games/401891815` | 83 | 733 | 0 | 1 | no |
| `/nhl/teams/21` | cached | `/nhl/teams/21/roster` | 105 | 781 | 0 | 1 | no |
| `/nhl/teams/21` | rendered | `/nhl/teams/21/roster` | 109 | 768 | 0 | 1 | no |
| `/nhl/teams/21/roster` | cached | `/players/4781550` | 75 | 889 | 0 | 1 | no |
| `/nhl/teams/21/roster` | rendered | `/players/4781550` | 93 | 888 | 0 | 1 | no |
| `/nhl/teams/21/stats` | cached | `/nhl/teams/21` | 83 | 2188 | 0 | 1 | no |
| `/nhl/teams/21/stats` | rendered | `/nhl/teams/21` | 89 | 1780 | 0 | 1 | no |
| `/nhl/games/401803652` | cached | `/nhl/games/401803652/scoring` | 71 | 793 | 0 | 1 | no |
| `/nhl/games/401803652` | rendered | `/nhl/games/401803652/scoring` | 78 | 780 | 0 | 1 | no |
| `/nhl/games/401803652/scoring` | cached | `/nhl/games/401803652` | 89 | 774 | 0 | 1 | no |
| `/nhl/games/401803652/scoring` | rendered | `/nhl/games/401803652` | 106 | 775 | 0 | 1 | no |
| `/nhl/games/401803652/pick` | cached | `/nhl/games/401803652` | 80 | 772 | 0 | 1 | no |
| `/nhl/games/401803652/pick` | rendered | `/nhl/games/401803652` | 103 | 755 | 0 | 1 | no |
| `/nhl/games/401892449` | rendered | `/nhl/teams/27` | 111 | 905 | 0 | 1 | no |
| `/players` | cached | `/nhl?tab=teams` | 82 | 776 | 0 | 1 | no |
| `/players` | rendered | `/nhl?tab=teams` | 85 | 776 | 0 | 1 | no |
| `/players?q=mar` | rendered | `/players/3852` | 71 | 891 | 0 | 1 | no |
| `/players/4024123` | cached | `/nhl/teams/21` | 105 | 1761 | 0 | 1 | no |
| `/players/4024123` | rendered | `/nhl/teams/21` | 112 | 1819 | 0 | 1 | no |
| `/players/4024123/games` | cached | `/nhl/games/401892434` | 73 | 695 | 0 | 1 | no |
| `/players/4024123/games` | rendered | `/nhl/games/401892434` | 78 | 707 | 0 | 1 | no |
| `/players/3067313` | cached | `/nhl/teams/21` | 110 | 1787 | 0 | 1 | no |
| `/players/3067313` | rendered | `/nhl/teams/21` | 106 | 1729 | 0 | 1 | no |

### Every layout shift

| Route | Page | When | Score | At ms | What moved |
| --- | --- | --- | --- | --- | --- |
| `/` | rendered | scores arrive | 0.0000 | 10978 | span[favorite-marker] "★ favorite team," |
| `/nhl` | cached | scores arrive | 0.0000 | 8994 | span[favorite-marker] "★ favorite team," |
| `/nhl` | rendered | scores arrive | 0.0000 | 9057 | span[favorite-marker] "★ favorite team," |
| `/nhl?tab=teams` | cached | scores arrive | 0.0000 | 9454 | span[favorite-marker] "★ favorite team," |
| `/nhl?tab=teams` | rendered | scores arrive | 0.0000 | 9360 | span[favorite-marker] "★ favorite team," |
| `/nhl/live` | rendered | scores arrive | 0.1506 | 9898 | section[section] "Upcoming 7statusawayhomenoteOTT "; tr[ledger-row] "STL at CHI, 7:00 PMCHI 56%STL 1-"; tr[ledger-row] "VGK at SEA, 8:40 PMSEA 59%VGK 2-"; tr[ledger-row] "FLA at LA, 9:00 PMLA 62%FLA 1-0-"; footer "Scores and stats from ESPN. Yoga" |
| `/nhl/teams/21` | cached | scores arrive | 0.0000 | 9723 | span[favorite-marker] "★ favorite team," |
| `/nhl/teams/21` | rendered | scores arrive | 0.0000 | 9511 | span[favorite-marker] "★ favorite team," |
| `/nhl/teams/21/roster` | cached | scores arrive | 0.0000 | 8807 | span[favorite-marker] "★ favorite team," |
| `/nhl/teams/21/roster` | rendered | scores arrive | 0.0000 | 9001 | span[favorite-marker] "★ favorite team," |
| `/nhl/teams/21/stats` | cached | scores arrive | 0.0000 | 8827 | span[favorite-marker] "★ favorite team," |
| `/nhl/teams/21/stats` | rendered | scores arrive | 0.0000 | 8879 | span[favorite-marker] "★ favorite team," |
| `/nhl/games/401803652` | cached | scores arrive | 0.0000 | 8095 | span[favorite-marker] "★ favorite team," |
| `/nhl/games/401803652` | rendered | scores arrive | 0.0000 | 8132 | span[favorite-marker] "★ favorite team," |
| `/nhl/games/401803652/scoring` | cached | scores arrive | 0.0000 | 8135 | span[favorite-marker] "★ favorite team," |
| `/nhl/games/401803652/scoring` | rendered | scores arrive | 0.0000 | 8123 | span[favorite-marker] "★ favorite team," |
| `/nhl/games/401803652/pick` | cached | scores arrive | 0.0000 | 8092 | span[favorite-marker] "★ favorite team," |
| `/nhl/games/401803652/pick` | rendered | scores arrive | 0.0000 | 8070 | span[favorite-marker] "★ favorite team," |
| `/nhl/games/401892449` | rendered | scores arrive | 0.0000 | 8143 | span[favorite-marker] "★ favorite team," |
| `/players` | cached | scores arrive | 0.0000 | 9128 | span[favorite-marker] "★ favorite team," |
| `/players` | rendered | scores arrive | 0.0000 | 9100 | span[favorite-marker] "★ favorite team," |
| `/players?q=mar` | rendered | scores arrive | 0.0000 | 9727 | span[favorite-marker] "★ favorite team," |
| `/players/4024123` | cached | scores arrive | 0.0000 | 8410 | span[favorite-marker] "★ favorite team," |
| `/players/4024123` | rendered | scores arrive | 0.0000 | 8367 | span[favorite-marker] "★ favorite team," |
| `/players/4024123/games` | cached | scores arrive | 0.0000 | 8374 | span[favorite-marker] "★ favorite team," |
| `/players/4024123/games` | rendered | scores arrive | 0.0000 | 8380 | span[favorite-marker] "★ favorite team," |
| `/players/3067313` | cached | scores arrive | 0.0000 | 8353 | span[favorite-marker] "★ favorite team," |
| `/players/3067313` | rendered | scores arrive | 0.0000 | 8375 | span[favorite-marker] "★ favorite team," |

### Paint and hydration

| Route | Page | First paint ms | Largest paint ms | Taps work from ms | The largest element |
| --- | --- | --- | --- | --- | --- |
| `/` | rendered | 820 | 820 | 6747 | span[picks-record] "picks: 3 right, 2 wrong" |
| `/nhl` | cached | 828 | 828 | 5177 | h2[section-header] "Metropolitan Division East" |
| `/nhl` | rendered | 832 | 832 | 5176 | h2[section-header] "Metropolitan Division East" |
| `/nhl?tab=teams` | cached | 820 | 820 | 5514 | td[ledger-cell] "Columbus Blue Jackets" |
| `/nhl?tab=teams` | rendered | 812 | 812 | 5518 | td[ledger-cell] "Columbus Blue Jackets" |
| `/nhl/live` | rendered | 828 | 828 | 5938 | footer "Scores and stats from ESPN. Yoga" |
| `/nhl/teams/21` | cached | 868 | 868 | 5465 | h2[section-header] "Toronto Maple Leafs Toronto · Ea" |
| `/nhl/teams/21` | rendered | 856 | 856 | 5437 | h2[section-header] "Toronto Maple Leafs Toronto · Ea" |
| `/nhl/teams/21/roster` | cached | 804 | 804 | 4901 | h2[section-header] "Toronto Maple Leafs Toronto · Ea" |
| `/nhl/teams/21/roster` | rendered | 820 | 820 | 4908 | h2[section-header] "Toronto Maple Leafs Toronto · Ea" |
| `/nhl/teams/21/stats` | cached | 808 | 808 | 4888 | h2[section-header] "Toronto Maple Leafs Toronto · Ea" |
| `/nhl/teams/21/stats` | rendered | 792 | 792 | 4910 | h2[section-header] "Toronto Maple Leafs Toronto · Ea" |
| `/nhl/games/401803652` | cached | 852 | 852 | 4272 | span[play-row] "Wyatt Johnston Goal Wrist Shot" |
| `/nhl/games/401803652` | rendered | 848 | 848 | 4265 | span[play-row] "Wyatt Johnston Goal Wrist Shot" |
| `/nhl/games/401803652/scoring` | cached | 824 | 824 | 4273 | span[play-row] "Mavrik Bourque Goal (20) Snap Sh" |
| `/nhl/games/401803652/scoring` | rendered | 900 | 900 | 4287 | span[play-row] "Mavrik Bourque Goal (20) Snap Sh" |
| `/nhl/games/401803652/pick` | cached | 824 | 824 | 4267 | p[game-pick-full] "Dallas Stars 55%. They have the " |
| `/nhl/games/401803652/pick` | rendered | 828 | 828 | 4264 | p[game-pick-full] "Dallas Stars 55%. They have the " |
| `/nhl/games/401892449` | rendered | 812 | 812 | 4248 | p[game-pick-full] "Toronto Maple Leafs 58%. They ha" |
| `/players` | cached | 776 | 776 | 4855 | footer "Scores and stats from ESPN. Yoga" |
| `/players` | rendered | 788 | 788 | 4864 | footer "Scores and stats from ESPN. Yoga" |
| `/players?q=mar` | rendered | 800 | 800 | 5494 | a[section-aside] "or browse a team's roster" |
| `/players/4024123` | cached | 800 | 800 | 4560 | div[section-aside] "692 GP · 429 G · 352 A · 781 PTS" |
| `/players/4024123` | rendered | 796 | 796 | 4553 | div[section-aside] "692 GP · 429 G · 352 A · 781 PTS" |
| `/players/4024123/games` | cached | 808 | 808 | 4555 | div[section-aside] "692 GP · 429 G · 352 A · 781 PTS" |
| `/players/4024123/games` | rendered | 808 | 808 | 4561 | div[section-aside] "692 GP · 429 G · 352 A · 781 PTS" |
| `/players/3067313` | cached | 796 | 796 | 4556 | span[player-header] "Goaltender · #41 · Toronto Maple" |
| `/players/3067313` | rendered | 796 | 796 | 4558 | span[player-header] "Goaltender · #41 · Toronto Maple" |

