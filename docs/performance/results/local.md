<!-- Written by scripts/measure-performance.ts. Do not edit: measure again. -->

Measured 2026-10-11T19:47:28.914Z against `http://localhost:5301`, 3 runs a route, on Intel(R) Core(TM) i7-7700 CPU @ 3.60GHz x 8, linux.

## Every route against every budget

| Route | Page | First paint ms | Largest paint ms (budget) | Shift on load | Shift as scores arrive | Slowest tap ms | Next shell ms | Blank frames | View transition | Script gzip kB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | rendered (none) | 1560 | **8312** ✗ (2500) | **0.0038** ✗ | 0.0000 | 72 (theme toggle) | **661** ✗ | 0 | no | 251.3 |
| `/nhl` | cached (hit) | 1580 | **1580** ✗ (1500) | 0.0000 | 0.0000 | 72 (theme toggle) | **820** ✗ | 0 | no | 244.0 |
| `/nhl` | rendered (bypass) | 1580 | 1580 (2500) | 0.0000 | 0.0000 | 72 (theme toggle) | **815** ✗ | 0 | no | 244.0 |
| `/nhl?tab=teams` | cached (hit, stale) | 1572 | **1572** ✗ (1500) | 0.0000 | 0.0000 | 72 (open the whole slate) | **829** ✗ | 0 | no | 244.0 |
| `/nhl?tab=teams` | rendered (bypass) | 1584 | 1584 (2500) | 0.0000 | 0.0000 | 64 (open the whole slate) | **810** ✗ | 0 | no | 244.0 |
| `/nhl/live` | rendered (none) | 1532 | 1532 (2500) | **0.0030** ✗ | **0.1351** ✗ | 64 (open the whole slate) | **693** ✗ | 0 | no | 246.8 |
| `/nhl/teams/21` | cached (hit, stale) | 1628 | **1628** ✗ (1500) | **0.0048** ✗ | 0.0000 | 104 (theme toggle) | **717** ✗ | 0 | no | 248.6 |
| `/nhl/teams/21` | rendered (bypass) | 1620 | 1620 (2500) | **0.0048** ✗ | 0.0000 | 104 (theme toggle) | **711** ✗ | 0 | no | 248.6 |
| `/nhl/teams/21/roster` | cached (hit, stale) | 1572 | **1572** ✗ (1500) | 0.0000 | 0.0000 | 64 (theme toggle) | **828** ✗ | 0 | no | 248.6 |
| `/nhl/teams/21/roster` | rendered (bypass) | 1576 | 1576 (2500) | 0.0000 | 0.0000 | 72 (theme toggle) | **825** ✗ | 0 | no | 248.6 |
| `/nhl/teams/21/stats` | cached (hit, stale) | 1564 | **1564** ✗ (1500) | 0.0000 | 0.0000 | 64 (open the whole slate) | **739** ✗ | 0 | no | 248.6 |
| `/nhl/teams/21/stats` | rendered (bypass) | 1584 | 1584 (2500) | 0.0000 | 0.0000 | 64 (open the whole slate) | **748** ✗ | 0 | no | 248.6 |
| `/nhl/games/401803652` | cached (stale, hit) | 1512 | **1512** ✗ (1500) | 0.0000 | 0.0000 | 80 (theme toggle) | **737** ✗ | 0 | no | 252.6 |
| `/nhl/games/401803652` | rendered (bypass) | 1548 | 1548 (2500) | 0.0000 | 0.0000 | 80 (theme toggle) | **743** ✗ | 0 | no | 252.6 |
| `/nhl/games/401803652/scoring` | cached (hit) | 1528 | **1528** ✗ (1500) | 0.0000 | 0.0000 | 72 (theme toggle) | **758** ✗ | 0 | no | 252.6 |
| `/nhl/games/401803652/scoring` | rendered (bypass) | 1528 | 1528 (2500) | 0.0000 | 0.0000 | 80 (theme toggle) | **756** ✗ | 0 | no | 252.6 |
| `/nhl/games/401803652/pick` | cached (hit) | 1568 | **1568** ✗ (1500) | **0.0087** ✗ | 0.0000 | 80 (theme toggle) | **759** ✗ | 0 | no | 252.6 |
| `/nhl/games/401803652/pick` | rendered (bypass) | 1540 | 1540 (2500) | **0.0012** ✗ | 0.0000 | 72 (theme toggle) | **782** ✗ | 0 | no | 252.6 |
| `/nhl/games/401892449` | rendered (miss) | 1524 | 1524 (2500) | **0.0014** ✗ | 0.0000 | 88 (open the whole slate) | **842** ✗ | 0 | no | 252.1 |
| `/players` | cached (hit, stale) | 1572 | **1572** ✗ (1500) | 0.0000 | 0.0000 | 72 (open the whole slate) | **701** ✗ | 0 | no | 250.9 |
| `/players` | rendered (bypass) | 1556 | 1556 (2500) | 0.0000 | 0.0000 | 64 (open the whole slate) | **706** ✗ | 0 | no | 250.9 |
| `/players?q=mar` | rendered (bypass) | 1572 | 1572 (2500) | 0.0000 | 0.0000 | 64 (open the whole slate) | **822** ✗ | 0 | no | 250.9 |
| `/players/4024123` | cached (hit) | 1588 | **1588** ✗ (1500) | 0.0000 | 0.0000 | 88 (theme toggle) | **1614** ✗ | 0 | no | 244.6 |
| `/players/4024123` | rendered (bypass) | 1588 | 1588 (2500) | 0.0000 | 0.0000 | 72 (open the whole slate) | **1637** ✗ | 0 | no | 244.6 |
| `/players/4024123/games` | cached (hit) | 1584 | **1584** ✗ (1500) | 0.0000 | 0.0000 | 72 (theme toggle) | **666** ✗ | 0 | no | 244.6 |
| `/players/4024123/games` | rendered (bypass) | 1592 | 1592 (2500) | 0.0000 | 0.0000 | 80 (theme toggle) | **680** ✗ | 0 | no | 244.6 |
| `/players/3067313` | cached (hit) | 1588 | **1588** ✗ (1500) | 0.0000 | 0.0000 | 72 (theme toggle) | **1647** ✗ | 0 | no | 244.6 |
| `/players/3067313` | rendered (bypass) | 1600 | 1600 (2500) | 0.0000 | 0.0000 | 80 (theme toggle) | **1604** ✗ | 0 | no | 244.6 |

## What each route sends

| Route | Script files | Script kB | Script gzip kB | **Script budget, gzip kB** | Document kB | Document gzip kB | Stylesheet gzip kB |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 39 | 798.5 | 251.3 | **252** | 128.6 | 13.2 | 16.2 |
| `/nhl` | 29 | 783.1 | 244.0 | **244** | 168.9 | 13.1 | 16.2 |
| `/nhl?tab=teams` | 29 | 783.1 | 244.0 | **244** | 88.6 | 10.9 | 16.2 |
| `/nhl/live` | 33 | 789.7 | 246.8 | **247** | 134.6 | 11.6 | 16.2 |
| `/nhl/teams/21` | 36 | 793.2 | 248.6 | **249** | 384.1 | 22.3 | 16.2 |
| `/nhl/teams/21/roster` | 36 | 793.2 | 248.6 | **249** | 148.3 | 12.7 | 16.2 |
| `/nhl/teams/21/stats` | 36 | 793.2 | 248.6 | **249** | 73.1 | 9.7 | 16.2 |
| `/nhl/games/401803652` | 33 | 807.7 | 252.6 | **253** | 294.3 | 27.8 | 16.2 |
| `/nhl/games/401803652/scoring` | 33 | 807.7 | 252.6 | **253** | 268.4 | 26.9 | 16.2 |
| `/nhl/games/401803652/pick` | 33 | 807.7 | 252.6 | **253** | 264.3 | 27.0 | 16.2 |
| `/nhl/games/401892449` | 32 | 806.8 | 252.1 | **253** | 100.9 | 12.5 | 16.2 |
| `/players` | 36 | 798.2 | 250.9 | **251** | 20.5 | 5.2 | 16.2 |
| `/players?q=mar` | 36 | 798.2 | 250.9 | **251** | 44.1 | 7.6 | 16.2 |
| `/players/4024123` | 30 | 784.4 | 244.6 | **245** | 142.6 | 12.8 | 16.2 |
| `/players/4024123/games` | 30 | 784.4 | 244.6 | **245** | 142.9 | 12.9 | 16.2 |
| `/players/3067313` | 30 | 784.4 | 244.6 | **245** | 128.6 | 12.3 | 16.2 |

## Detail

### Every tap

| Route | Page | Tap | ms to next paint |
| --- | --- | --- | --- |
| `/` | rendered | theme toggle | 72 |
| `/` | rendered | open the whole slate | 72 |
| `/` | rendered | open the menu | 64 |
| `/nhl` | cached | theme toggle | 72 |
| `/nhl` | cached | open the whole slate | 72 |
| `/nhl` | cached | open the menu | 56 |
| `/nhl` | rendered | theme toggle | 72 |
| `/nhl` | rendered | open the whole slate | 72 |
| `/nhl` | rendered | open the menu | 64 |
| `/nhl?tab=teams` | cached | theme toggle | 56 |
| `/nhl?tab=teams` | cached | open the whole slate | 72 |
| `/nhl?tab=teams` | cached | open the menu | 56 |
| `/nhl?tab=teams` | rendered | theme toggle | 56 |
| `/nhl?tab=teams` | rendered | open the whole slate | 64 |
| `/nhl?tab=teams` | rendered | open the menu | 64 |
| `/nhl/live` | rendered | theme toggle | 56 |
| `/nhl/live` | rendered | open the whole slate | 64 |
| `/nhl/live` | rendered | open the menu | 56 |
| `/nhl/teams/21` | cached | theme toggle | 104 |
| `/nhl/teams/21` | cached | open the whole slate | 80 |
| `/nhl/teams/21` | cached | favorite heart | 56 |
| `/nhl/teams/21` | cached | open the menu | 64 |
| `/nhl/teams/21` | rendered | theme toggle | 104 |
| `/nhl/teams/21` | rendered | open the whole slate | 80 |
| `/nhl/teams/21` | rendered | favorite heart | 56 |
| `/nhl/teams/21` | rendered | open the menu | 56 |
| `/nhl/teams/21/roster` | cached | theme toggle | 64 |
| `/nhl/teams/21/roster` | cached | open the whole slate | 64 |
| `/nhl/teams/21/roster` | cached | favorite heart | 48 |
| `/nhl/teams/21/roster` | cached | open the menu | 64 |
| `/nhl/teams/21/roster` | rendered | theme toggle | 72 |
| `/nhl/teams/21/roster` | rendered | open the whole slate | 72 |
| `/nhl/teams/21/roster` | rendered | favorite heart | 48 |
| `/nhl/teams/21/roster` | rendered | open the menu | 64 |
| `/nhl/teams/21/stats` | cached | theme toggle | 56 |
| `/nhl/teams/21/stats` | cached | open the whole slate | 64 |
| `/nhl/teams/21/stats` | cached | favorite heart | 56 |
| `/nhl/teams/21/stats` | cached | open the menu | 64 |
| `/nhl/teams/21/stats` | rendered | theme toggle | 56 |
| `/nhl/teams/21/stats` | rendered | open the whole slate | 64 |
| `/nhl/teams/21/stats` | rendered | favorite heart | 56 |
| `/nhl/teams/21/stats` | rendered | open the menu | 64 |
| `/nhl/games/401803652` | cached | theme toggle | 80 |
| `/nhl/games/401803652` | cached | open the whole slate | 64 |
| `/nhl/games/401803652` | cached | select a goal on the timeline | 48 |
| `/nhl/games/401803652` | cached | open the menu | 64 |
| `/nhl/games/401803652` | rendered | theme toggle | 80 |
| `/nhl/games/401803652` | rendered | open the whole slate | 64 |
| `/nhl/games/401803652` | rendered | select a goal on the timeline | 56 |
| `/nhl/games/401803652` | rendered | open the menu | 64 |
| `/nhl/games/401803652/scoring` | cached | theme toggle | 72 |
| `/nhl/games/401803652/scoring` | cached | open the whole slate | 64 |
| `/nhl/games/401803652/scoring` | cached | select a goal on the timeline | 48 |
| `/nhl/games/401803652/scoring` | cached | open the menu | 56 |
| `/nhl/games/401803652/scoring` | rendered | theme toggle | 80 |
| `/nhl/games/401803652/scoring` | rendered | open the whole slate | 72 |
| `/nhl/games/401803652/scoring` | rendered | select a goal on the timeline | 48 |
| `/nhl/games/401803652/scoring` | rendered | open the menu | 56 |
| `/nhl/games/401803652/pick` | cached | theme toggle | 80 |
| `/nhl/games/401803652/pick` | cached | open the whole slate | 72 |
| `/nhl/games/401803652/pick` | cached | select a goal on the timeline | 48 |
| `/nhl/games/401803652/pick` | cached | open the menu | 64 |
| `/nhl/games/401803652/pick` | rendered | theme toggle | 72 |
| `/nhl/games/401803652/pick` | rendered | open the whole slate | 64 |
| `/nhl/games/401803652/pick` | rendered | select a goal on the timeline | 48 |
| `/nhl/games/401803652/pick` | rendered | open the menu | 64 |
| `/nhl/games/401892449` | rendered | theme toggle | 72 |
| `/nhl/games/401892449` | rendered | open the whole slate | 88 |
| `/nhl/games/401892449` | rendered | open the menu | 88 |
| `/players` | cached | theme toggle | 48 |
| `/players` | cached | open the whole slate | 72 |
| `/players` | cached | type in the search | 16 |
| `/players` | cached | open the menu | 56 |
| `/players` | rendered | theme toggle | 48 |
| `/players` | rendered | open the whole slate | 64 |
| `/players` | rendered | type in the search | 24 |
| `/players` | rendered | open the menu | 64 |
| `/players?q=mar` | rendered | theme toggle | 56 |
| `/players?q=mar` | rendered | open the whole slate | 64 |
| `/players?q=mar` | rendered | favorite heart | 32 |
| `/players?q=mar` | rendered | open the menu | 64 |
| `/players/4024123` | cached | theme toggle | 88 |
| `/players/4024123` | cached | open the whole slate | 64 |
| `/players/4024123` | cached | favorite heart | 32 |
| `/players/4024123` | cached | open the menu | 64 |
| `/players/4024123` | rendered | theme toggle | 64 |
| `/players/4024123` | rendered | open the whole slate | 72 |
| `/players/4024123` | rendered | favorite heart | 32 |
| `/players/4024123` | rendered | open the menu | 64 |
| `/players/4024123/games` | cached | theme toggle | 72 |
| `/players/4024123/games` | cached | open the whole slate | 72 |
| `/players/4024123/games` | cached | favorite heart | 32 |
| `/players/4024123/games` | cached | open the menu | 64 |
| `/players/4024123/games` | rendered | theme toggle | 80 |
| `/players/4024123/games` | rendered | open the whole slate | 72 |
| `/players/4024123/games` | rendered | favorite heart | 32 |
| `/players/4024123/games` | rendered | open the menu | 64 |
| `/players/3067313` | cached | theme toggle | 72 |
| `/players/3067313` | cached | open the whole slate | 64 |
| `/players/3067313` | cached | favorite heart | 32 |
| `/players/3067313` | cached | open the menu | 64 |
| `/players/3067313` | rendered | theme toggle | 80 |
| `/players/3067313` | rendered | open the whole slate | 72 |
| `/players/3067313` | rendered | favorite heart | 32 |
| `/players/3067313` | rendered | open the menu | 64 |

### Every navigation

| From | Page | To | Shell ms | Content ms | Blank frames | Requests after the tap | Whole document loaded |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | rendered | `/nhl/games/401891815` | 661 | 661 | 0 | 1 | no |
| `/nhl` | cached | `/nhl/teams/14` | 820 | 820 | 0 | 1 | no |
| `/nhl` | rendered | `/nhl/teams/14` | 815 | 815 | 0 | 1 | no |
| `/nhl?tab=teams` | cached | `/nhl/teams/25` | 829 | 829 | 0 | 1 | no |
| `/nhl?tab=teams` | rendered | `/nhl/teams/25` | 810 | 810 | 0 | 1 | no |
| `/nhl/live` | rendered | `/nhl/games/401892449` | 693 | 1277 | 0 | 1 | no |
| `/nhl/teams/21` | cached | `/nhl/teams/21/roster` | 717 | 717 | 0 | 1 | no |
| `/nhl/teams/21` | rendered | `/nhl/teams/21/roster` | 711 | 711 | 0 | 1 | no |
| `/nhl/teams/21/roster` | cached | `/players/4781550` | 828 | 828 | 0 | 1 | no |
| `/nhl/teams/21/roster` | rendered | `/players/4781550` | 825 | 825 | 0 | 1 | no |
| `/nhl/teams/21/stats` | cached | `/nhl/teams/21` | 739 | 1070 | 0 | 1 | no |
| `/nhl/teams/21/stats` | rendered | `/nhl/teams/21` | 748 | 1121 | 0 | 1 | no |
| `/nhl/games/401803652` | cached | `/nhl/games/401803652/scoring` | 737 | 737 | 0 | 1 | no |
| `/nhl/games/401803652` | rendered | `/nhl/games/401803652/scoring` | 743 | 743 | 0 | 1 | no |
| `/nhl/games/401803652/scoring` | cached | `/nhl/games/401803652` | 758 | 758 | 0 | 1 | no |
| `/nhl/games/401803652/scoring` | rendered | `/nhl/games/401803652` | 756 | 756 | 0 | 1 | no |
| `/nhl/games/401803652/pick` | cached | `/nhl/games/401803652` | 759 | 759 | 0 | 1 | no |
| `/nhl/games/401803652/pick` | rendered | `/nhl/games/401803652` | 782 | 782 | 0 | 1 | no |
| `/nhl/games/401892449` | rendered | `/nhl/teams/27` | 842 | 842 | 0 | 1 | no |
| `/players` | cached | `/nhl?tab=teams` | 701 | 701 | 0 | 1 | no |
| `/players` | rendered | `/nhl?tab=teams` | 706 | 706 | 0 | 1 | no |
| `/players?q=mar` | rendered | `/players/3852` | 822 | 822 | 0 | 1 | no |
| `/players/4024123` | cached | `/nhl/teams/21` | 1614 | 1614 | 0 | 1 | no |
| `/players/4024123` | rendered | `/nhl/teams/21` | 1637 | 1637 | 0 | 1 | no |
| `/players/4024123/games` | cached | `/nhl/games/401892434` | 666 | 666 | 0 | 1 | no |
| `/players/4024123/games` | rendered | `/nhl/games/401892434` | 680 | 680 | 0 | 1 | no |
| `/players/3067313` | cached | `/nhl/teams/21` | 1647 | 1750 | 0 | 1 | no |
| `/players/3067313` | rendered | `/nhl/teams/21` | 1604 | 1604 | 0 | 1 | no |

### Every layout shift

| Route | Page | When | Score | At ms | What moved |
| --- | --- | --- | --- | --- | --- |
| `/` | rendered | load | 0.0030 | 7113 | li[score-ticker] "★ favorite team, NSH@atTOR6:00 P" |
| `/` | rendered | load | 0.0008 | 8293 | div "Standings eastern conferencefull" |
| `/nhl/live` | rendered | load | 0.0030 | 6343 | li[score-ticker] "★ favorite team, NSH@atTOR6:00 P" |
| `/nhl/live` | rendered | scores arrive | 0.1351 | 9934 | section[section] "Upcoming 7statusawayhomenoteOTT "; tr[ledger-row] "STL at CHI, 7:00 PMCHI 56%STL 1-"; footer "Scores and stats from ESPN. Yoga"; tr[ledger-row] "VGK at SEA, 8:40 PMSEA 59%VGK 2-"; tr[ledger-row] "FLA at LA, 9:00 PMLA 62%FLA 1-0-" |
| `/nhl/teams/21` | cached | load | 0.0048 | 6906 | td[ledger-cell] "6:00 PM"; td[ledger-cell] "9:00 PM"; td[ledger-cell] "8:00 PM" |
| `/nhl/teams/21` | rendered | load | 0.0048 | 6993 | td[ledger-cell] "6:00 PM"; td[ledger-cell] "9:00 PM"; td[ledger-cell] "8:00 PM" |
| `/nhl/games/401803652/pick` | cached | load | 0.0043 | 5040 | footer "Scores and stats from ESPN. Yoga" |
| `/nhl/games/401803652/pick` | cached | load | 0.0043 | 5134 | footer "Scores and stats from ESPN. Yoga" |
| `/nhl/games/401803652/pick` | rendered | load | 0.0012 | 5037 | text |
| `/nhl/games/401892449` | rendered | load | 0.0014 | 4881 | text |

### Paint and hydration

| Route | Page | First paint ms | Largest paint ms | Taps work from ms | The largest element |
| --- | --- | --- | --- | --- | --- |
| `/` | rendered | 1560 | 8312 | 6989 | div[ledger-detail] "3 GP · 1 G · 0 A · 1 PTS" |
| `/nhl` | cached | 1580 | 1580 | 6038 | h2[section-header] "Metropolitan Division East" |
| `/nhl` | rendered | 1580 | 1580 | 6040 | h2[section-header] "Metropolitan Division East" |
| `/nhl?tab=teams` | cached | 1572 | 1572 | 6606 | td[ledger-cell] "Columbus Blue Jackets" |
| `/nhl?tab=teams` | rendered | 1584 | 1584 | 6611 | td[ledger-cell] "Columbus Blue Jackets" |
| `/nhl/live` | rendered | 1532 | 1532 | 6101 | footer "Scores and stats from ESPN. Yoga" |
| `/nhl/teams/21` | cached | 1628 | 1628 | 6420 | h2[section-header] "Toronto Maple Leafs Toronto · Ea" |
| `/nhl/teams/21` | rendered | 1620 | 1620 | 6415 | h2[section-header] "Toronto Maple Leafs Toronto · Ea" |
| `/nhl/teams/21/roster` | cached | 1572 | 1572 | 5201 | h2[section-header] "Toronto Maple Leafs Toronto · Ea" |
| `/nhl/teams/21/roster` | rendered | 1576 | 1576 | 5191 | h2[section-header] "Toronto Maple Leafs Toronto · Ea" |
| `/nhl/teams/21/stats` | cached | 1564 | 1564 | 5208 | h2[section-header] "Toronto Maple Leafs Toronto · Ea" |
| `/nhl/teams/21/stats` | rendered | 1584 | 1584 | 5200 | h2[section-header] "Toronto Maple Leafs Toronto · Ea" |
| `/nhl/games/401803652` | cached | 1512 | 1512 | 4301 | span[play-row] "Josh Doan Backhand saved by Jake" |
| `/nhl/games/401803652` | rendered | 1548 | 1548 | 4445 | span[play-row] "Josh Doan Backhand saved by Jake" |
| `/nhl/games/401803652/scoring` | cached | 1528 | 1528 | 4451 | span[play-row] "Josh Norris Goal (13) Wrist Shot" |
| `/nhl/games/401803652/scoring` | rendered | 1528 | 1528 | 4444 | span[play-row] "Josh Norris Goal (13) Wrist Shot" |
| `/nhl/games/401803652/pick` | cached | 1568 | 1568 | 4342 | p[game-pick-full] "Dallas Stars 55%. They have the " |
| `/nhl/games/401803652/pick` | rendered | 1540 | 1540 | 4359 | p[game-pick-full] "Dallas Stars 55%. They have the " |
| `/nhl/games/401892449` | rendered | 1524 | 1524 | 4322 | p[game-pick-full] "Toronto Maple Leafs 58%. They ha" |
| `/players` | cached | 1572 | 1572 | 5089 | footer "Scores and stats from ESPN. Yoga" |
| `/players` | rendered | 1556 | 1556 | 5079 | footer "Scores and stats from ESPN. Yoga" |
| `/players?q=mar` | rendered | 1572 | 1572 | 5721 | footer "Scores and stats from ESPN. Yoga" |
| `/players/4024123` | cached | 1588 | 1588 | 4675 | div[section-header] "692 GP · 429 G · 352 A · 781 PTS" |
| `/players/4024123` | rendered | 1588 | 1588 | 4666 | div[section-header] "692 GP · 429 G · 352 A · 781 PTS" |
| `/players/4024123/games` | cached | 1584 | 1584 | 4684 | div[section-header] "692 GP · 429 G · 352 A · 781 PTS" |
| `/players/4024123/games` | rendered | 1592 | 1592 | 4699 | div[section-header] "692 GP · 429 G · 352 A · 781 PTS" |
| `/players/3067313` | cached | 1588 | 1588 | 4679 | span[player-header] "Goaltender · #41 · Toronto Maple" |
| `/players/3067313` | rendered | 1600 | 1600 | 4676 | span[player-header] "Goaltender · #41 · Toronto Maple" |

