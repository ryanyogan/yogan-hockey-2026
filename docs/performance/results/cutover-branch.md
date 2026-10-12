<!-- Written by scripts/measure-performance.ts. Do not edit: measure again. -->

Measured 2026-10-12T18:22:32.406Z to 2026-10-12T19:54:05.061Z against `http://localhost:5352` (019d70c The baseline script prepares and measures a site wit), 3 runs a route, on AMD Ryzen AI 9 HX 370 w/ Radeon 890M x 24, linux, its load 1.3 as the run began and 4.3 as it ended.

## Every route against every budget

| Route | Page | First paint ms | Largest paint ms (budget) | Shift on load | Shift as scores arrive | Slowest tap ms | Next shell ms | Blank frames | View transition | Script gzip kB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | rendered (kv cold) | 1576 | 1576 (2500) | **0.0512** ✗ | **0.1214** ✗ | 40 (theme toggle) | **802** ✗ | 0 | yes | 203.1 |
| `/` | rendered (kv warm) | 1568 | 1568 (2500) | **0.0512** ✗ | **0.1214** ✗ | 32 (theme toggle) | **797** ✗ | 0 | yes | 203.1 |
| `/nhl` | rendered (kv cold) | 1560 | 1560 (2500) | **0.0065** ✗ | **0.0007** ✗ | 72 (open the whole slate) | **1228** ✗ | 0 | yes | 195.8 |
| `/nhl` | rendered (kv warm) | 1580 | 1580 (2500) | **0.0065** ✗ | **0.0007** ✗ | 48 (theme toggle) | **1229** ✗ | 0 | yes | 195.8 |
| `/nhl?tab=teams` | rendered (kv cold) | 1556 | 1556 (2500) | **0.0042** ✗ | **0.0007** ✗ | 48 (theme toggle) | **1224** ✗ | 0 | yes | 195.8 |
| `/nhl?tab=teams` | rendered (kv warm) | 1552 | 1552 (2500) | **0.0043** ✗ | **0.0007** ✗ | 48 (open the whole slate) | **1243** ✗ | 0 | yes | 195.8 |
| `/nhl/live` | rendered (kv cold) | 1560 | 1560 (2500) | **0.0133** ✗ | **0.0851** ✗ | 64 (open the whole slate) | **1280** ✗ | 0 | yes | 199.3 |
| `/nhl/live` | rendered (kv warm) | 1560 | 1560 (2500) | **0.0133** ✗ | **0.0851** ✗ | 72 (theme toggle) | **1296** ✗ | 0 | yes | 199.3 |
| `/nhl/teams/21` | rendered (kv cold) | 1580 | 1580 (2500) | **0.0291** ✗ | **0.0007** ✗ | 56 (theme toggle) | **645** ✗ | 0 | yes | 200.2 |
| `/nhl/teams/21` | rendered (kv warm) | 1584 | 1584 (2500) | **0.0291** ✗ | **0.0007** ✗ | 56 (theme toggle) | **661** ✗ | 0 | yes | 200.2 |
| `/nhl/teams/21/roster` | rendered (kv cold) | 1548 | 1548 (2500) | **0.0279** ✗ | **0.0007** ✗ | 56 (open the whole slate) | **673** ✗ | 0 | yes | 199.9 |
| `/nhl/teams/21/roster` | rendered (kv warm) | 1548 | 1548 (2500) | **0.0279** ✗ | **0.0007** ✗ | 48 (theme toggle) | **713** ✗ | 0 | yes | 199.9 |
| `/nhl/teams/21/stats` | rendered (kv cold) | 1556 | 1556 (2500) | **0.0290** ✗ | **0.0007** ✗ | 48 (theme toggle) | **788** ✗ | 0 | yes | 200.0 |
| `/nhl/teams/21/stats` | rendered (kv warm) | 1552 | 1552 (2500) | **0.0287** ✗ | **0.0007** ✗ | 64 (open the whole slate) | **731** ✗ | 0 | yes | 200.0 |
| `/nhl/games/401803652` | rendered (kv cold) | 1592 | 1592 (2500) | **0.0042** ✗ | **0.0007** ✗ | 72 (theme toggle) | 83 | 0 | yes | 216.0 |
| `/nhl/games/401803652` | rendered (kv warm) | 1560 | 1560 (2500) | **0.0042** ✗ | **0.0007** ✗ | 64 (theme toggle) | 59 | 0 | yes | 216.0 |
| `/nhl/games/401803652/scoring` | rendered (kv cold) | 1564 | 1564 (2500) | **0.0042** ✗ | **0.0007** ✗ | 72 (theme toggle) | 85 | 0 | yes | 216.0 |
| `/nhl/games/401803652/scoring` | rendered (kv warm) | 1596 | 1596 (2500) | **0.0042** ✗ | **0.0007** ✗ | 72 (theme toggle) | 83 | 0 | yes | 216.0 |
| `/nhl/games/401803652/pick` | rendered (kv cold) | 1540 | 1540 (2500) | **0.0042** ✗ | **0.0007** ✗ | 72 (theme toggle) | 85 | 0 | yes | 216.0 |
| `/nhl/games/401803652/pick` | rendered (kv warm) | 1528 | 1528 (2500) | **0.0042** ✗ | **0.0007** ✗ | 72 (theme toggle) | 98 | 0 | yes | 216.0 |
| `/nhl/games/401892449` | rendered (kv cold) | 1548 | 1548 (2500) | **0.0266** ✗ | **0.0007** ✗ | 64 (theme toggle) | **1212** ✗ | 0 | yes | 216.0 |
| `/nhl/games/401892449` | rendered (kv warm) | 1532 | 1532 (2500) | **0.0266** ✗ | **0.0007** ✗ | 64 (theme toggle) | **1242** ✗ | 0 | yes | 216.0 |
| `/players` | rendered (kv cold) | 1560 | 1560 (2500) | **0.0045** ✗ | **0.0007** ✗ | 48 (theme toggle) | **687** ✗ | 0 | yes | 197.4 |
| `/players` | rendered (kv warm) | 1560 | 1560 (2500) | **0.0045** ✗ | **0.0007** ✗ | 56 (open the whole slate) | **680** ✗ | 0 | yes | 197.4 |
| `/players?q=mar` | rendered (kv cold) | 1572 | 1572 (2500) | **0.0057** ✗ | **0.0007** ✗ | 48 (open the whole slate) | **702** ✗ | 0 | yes | 197.4 |
| `/players?q=mar` | rendered (kv warm) | 1564 | 1564 (2500) | **0.0057** ✗ | **0.0007** ✗ | 64 (open the whole slate) | **706** ✗ | 0 | yes | 197.4 |
| `/players/4024123` | rendered (kv cold) | 1572 | 1572 (2500) | **0.0081** ✗ | **0.0007** ✗ | 64 (theme toggle) | **1412** ✗ | 0 | yes | 196.5 |
| `/players/4024123` | rendered (kv warm) | 1572 | 1572 (2500) | **0.0081** ✗ | **0.0007** ✗ | 48 (theme toggle) | **1360** ✗ | 0 | yes | 196.5 |
| `/players/4024123/games` | rendered (kv cold) | 1576 | 1576 (2500) | **0.0080** ✗ | **0.0007** ✗ | 72 (theme toggle) | **1329** ✗ | 0 | yes | 196.5 |
| `/players/4024123/games` | rendered (kv warm) | 1572 | 1572 (2500) | **0.0080** ✗ | **0.0007** ✗ | 64 (theme toggle) | **1330** ✗ | 0 | yes | 196.5 |
| `/players/3067313` | rendered (kv cold) | 1576 | 1576 (2500) | **0.0055** ✗ | **0.0007** ✗ | 64 (theme toggle) | **1358** ✗ | 0 | yes | 196.5 |
| `/players/3067313` | rendered (kv warm) | 1568 | 1568 (2500) | **0.0055** ✗ | **0.0007** ✗ | 64 (theme toggle) | **1417** ✗ | 0 | yes | 196.5 |
| `/no-such-page` | rendered (kv cold) | 1548 | 1548 (2500) | **0.0043** ✗ | **0.0007** ✗ | 64 (open the whole slate) | **1842** ✗ | 0 | yes | 192.2 |
| `/no-such-page` | rendered (kv warm) | 1556 | 1556 (2500) | **0.0043** ✗ | **0.0007** ✗ | 64 (open the whole slate) | **1846** ✗ | 0 | yes | 192.2 |

## What each route sends

| Route | Script files | Script kB | Script gzip kB | **Script budget, gzip kB** | Document kB | Document gzip kB | Stylesheet gzip kB |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 23 | 662.4 | 203.1 | **252** | 68.1 | 9.1 | 11.3 |
| `/nhl` | 18 | 643.9 | 195.8 | **244** | 108.7 | 10.7 | 11.3 |
| `/nhl?tab=teams` | 18 | 643.9 | 195.8 | **244** | 61.1 | 8.7 | 11.3 |
| `/nhl/live` | 20 | 652.1 | 199.3 | **247** | 61.0 | 8.0 | 11.3 |
| `/nhl/teams/21` | 23 | 655.1 | 200.2 | **249** | 194.6 | 16.8 | 11.3 |
| `/nhl/teams/21/roster` | 24 | 653.3 | 199.9 | **249** | 92.1 | 10.4 | 11.3 |
| `/nhl/teams/21/stats` | 24 | 653.9 | 200.0 | **249** | 58.5 | 8.7 | 11.3 |
| `/nhl/games/401803652` | 25 | 702.6 | 216.0 | **253** | 287.1 | 31.5 | 11.3 |
| `/nhl/games/401803652/scoring` | 25 | 702.6 | 216.0 | **253** | 252.7 | 30.5 | 11.3 |
| `/nhl/games/401803652/pick` | 25 | 702.6 | 216.0 | **253** | 247.1 | 30.5 | 11.3 |
| `/nhl/games/401892449` | 25 | 702.6 | 216.0 | **253** | 83.7 | 12.0 | 11.3 |
| `/players` | 16 | 647.7 | 197.4 | **251** | 42.8 | 7.1 | 11.3 |
| `/players?q=mar` | 16 | 647.7 | 197.4 | **251** | 61.1 | 8.4 | 11.3 |
| `/players/4024123` | 19 | 646.3 | 196.5 | **245** | 94.9 | 10.7 | 11.3 |
| `/players/4024123/games` | 19 | 646.4 | 196.5 | **245** | 95.0 | 10.7 | 11.3 |
| `/players/3067313` | 19 | 646.3 | 196.5 | **245** | 88.9 | 10.5 | 11.3 |
| `/no-such-page` | 11 | 636.2 | 192.2 | **193** | 41.1 | 6.5 | 11.3 |

## Detail

### Errors the pages logged

| Route | Page | Error |
| --- | --- | --- |
| `/no-such-page` | rendered | Failed to load resource: the server responded with a status of 404 (Not Found) |
| `/no-such-page` | rendered | Failed to load resource: the server responded with a status of 404 (Not Found) |

### Every tap

| Route | Page | Tap | ms to next paint |
| --- | --- | --- | --- |
| `/` | rendered | theme toggle | 40 |
| `/` | rendered | open the whole slate | n/a |
| `/` | rendered | theme toggle | 32 |
| `/` | rendered | open the whole slate | n/a |
| `/nhl` | rendered | theme toggle | 64 |
| `/nhl` | rendered | open the whole slate | 72 |
| `/nhl` | rendered | theme toggle | 48 |
| `/nhl` | rendered | open the whole slate | 48 |
| `/nhl?tab=teams` | rendered | theme toggle | 48 |
| `/nhl?tab=teams` | rendered | open the whole slate | 48 |
| `/nhl?tab=teams` | rendered | theme toggle | 40 |
| `/nhl?tab=teams` | rendered | open the whole slate | 48 |
| `/nhl/live` | rendered | theme toggle | 48 |
| `/nhl/live` | rendered | open the whole slate | 64 |
| `/nhl/live` | rendered | theme toggle | 72 |
| `/nhl/live` | rendered | open the whole slate | 72 |
| `/nhl/teams/21` | rendered | theme toggle | 56 |
| `/nhl/teams/21` | rendered | open the whole slate | 56 |
| `/nhl/teams/21` | rendered | favorite heart | 40 |
| `/nhl/teams/21` | rendered | theme toggle | 56 |
| `/nhl/teams/21` | rendered | open the whole slate | 56 |
| `/nhl/teams/21` | rendered | favorite heart | 40 |
| `/nhl/teams/21/roster` | rendered | theme toggle | 48 |
| `/nhl/teams/21/roster` | rendered | open the whole slate | 56 |
| `/nhl/teams/21/roster` | rendered | favorite heart | 40 |
| `/nhl/teams/21/roster` | rendered | theme toggle | 48 |
| `/nhl/teams/21/roster` | rendered | open the whole slate | 48 |
| `/nhl/teams/21/roster` | rendered | favorite heart | 40 |
| `/nhl/teams/21/stats` | rendered | theme toggle | 48 |
| `/nhl/teams/21/stats` | rendered | open the whole slate | 48 |
| `/nhl/teams/21/stats` | rendered | favorite heart | 40 |
| `/nhl/teams/21/stats` | rendered | theme toggle | 48 |
| `/nhl/teams/21/stats` | rendered | open the whole slate | 64 |
| `/nhl/teams/21/stats` | rendered | favorite heart | 40 |
| `/nhl/games/401803652` | rendered | theme toggle | 72 |
| `/nhl/games/401803652` | rendered | open the whole slate | 56 |
| `/nhl/games/401803652` | rendered | select a goal on the timeline | 48 |
| `/nhl/games/401803652` | rendered | theme toggle | 64 |
| `/nhl/games/401803652` | rendered | open the whole slate | 56 |
| `/nhl/games/401803652` | rendered | select a goal on the timeline | 48 |
| `/nhl/games/401803652/scoring` | rendered | theme toggle | 72 |
| `/nhl/games/401803652/scoring` | rendered | open the whole slate | 72 |
| `/nhl/games/401803652/scoring` | rendered | select a goal on the timeline | 64 |
| `/nhl/games/401803652/scoring` | rendered | theme toggle | 72 |
| `/nhl/games/401803652/scoring` | rendered | open the whole slate | 72 |
| `/nhl/games/401803652/scoring` | rendered | select a goal on the timeline | 64 |
| `/nhl/games/401803652/pick` | rendered | theme toggle | 72 |
| `/nhl/games/401803652/pick` | rendered | open the whole slate | 48 |
| `/nhl/games/401803652/pick` | rendered | select a goal on the timeline | 48 |
| `/nhl/games/401803652/pick` | rendered | theme toggle | 72 |
| `/nhl/games/401803652/pick` | rendered | open the whole slate | 64 |
| `/nhl/games/401803652/pick` | rendered | select a goal on the timeline | 64 |
| `/nhl/games/401892449` | rendered | theme toggle | 64 |
| `/nhl/games/401892449` | rendered | open the whole slate | 64 |
| `/nhl/games/401892449` | rendered | theme toggle | 64 |
| `/nhl/games/401892449` | rendered | open the whole slate | 64 |
| `/players` | rendered | theme toggle | 48 |
| `/players` | rendered | open the whole slate | 48 |
| `/players` | rendered | type in the search | 40 |
| `/players` | rendered | theme toggle | 48 |
| `/players` | rendered | open the whole slate | 56 |
| `/players` | rendered | type in the search | 40 |
| `/players?q=mar` | rendered | theme toggle | 40 |
| `/players?q=mar` | rendered | open the whole slate | 48 |
| `/players?q=mar` | rendered | favorite heart | 32 |
| `/players?q=mar` | rendered | theme toggle | 56 |
| `/players?q=mar` | rendered | open the whole slate | 64 |
| `/players?q=mar` | rendered | favorite heart | 32 |
| `/players/4024123` | rendered | theme toggle | 64 |
| `/players/4024123` | rendered | open the whole slate | 64 |
| `/players/4024123` | rendered | favorite heart | 32 |
| `/players/4024123` | rendered | theme toggle | 48 |
| `/players/4024123` | rendered | open the whole slate | 48 |
| `/players/4024123` | rendered | favorite heart | 32 |
| `/players/4024123/games` | rendered | theme toggle | 72 |
| `/players/4024123/games` | rendered | open the whole slate | 64 |
| `/players/4024123/games` | rendered | favorite heart | 32 |
| `/players/4024123/games` | rendered | theme toggle | 64 |
| `/players/4024123/games` | rendered | open the whole slate | 64 |
| `/players/4024123/games` | rendered | favorite heart | 32 |
| `/players/3067313` | rendered | theme toggle | 64 |
| `/players/3067313` | rendered | open the whole slate | 64 |
| `/players/3067313` | rendered | favorite heart | 32 |
| `/players/3067313` | rendered | theme toggle | 64 |
| `/players/3067313` | rendered | open the whole slate | 56 |
| `/players/3067313` | rendered | favorite heart | 32 |
| `/no-such-page` | rendered | theme toggle | 48 |
| `/no-such-page` | rendered | open the whole slate | 64 |
| `/no-such-page` | rendered | theme toggle | 48 |
| `/no-such-page` | rendered | open the whole slate | 64 |

### Every navigation

| From | Page | To | Shell ms | Content ms | Blank frames | Requests after the tap | Whole document loaded | Arrived at not-found |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | rendered | `/nhl/games/401891815` | 802 | 802 | 0 | 1 | no | no |
| `/` | rendered | `/nhl/games/401891815` | 797 | 797 | 0 | 1 | no | no |
| `/nhl` | rendered | `/nhl/teams/14` | 1228 | 1228 | 0 | 2 | no | no |
| `/nhl` | rendered | `/nhl/teams/14` | 1229 | 1229 | 0 | 2 | no | no |
| `/nhl?tab=teams` | rendered | `/nhl/teams/25` | 1224 | 1224 | 0 | 2 | no | no |
| `/nhl?tab=teams` | rendered | `/nhl/teams/25` | 1243 | 1243 | 0 | 2 | no | no |
| `/nhl/live` | rendered | `/nhl/games/401892449` | 1280 | 1280 | 0 | 1 | no | no |
| `/nhl/live` | rendered | `/nhl/games/401892449` | 1296 | 1296 | 0 | 1 | no | no |
| `/nhl/teams/21` | rendered | `/nhl/teams/21/roster` | 645 | 645 | 0 | 1 | no | no |
| `/nhl/teams/21` | rendered | `/nhl/teams/21/roster` | 661 | 661 | 0 | 1 | no | no |
| `/nhl/teams/21/roster` | rendered | `/players/4781550` | 673 | 673 | 0 | 1 | no | no |
| `/nhl/teams/21/roster` | rendered | `/players/4781550` | 713 | 713 | 0 | 1 | no | no |
| `/nhl/teams/21/stats` | rendered | `/nhl/teams/21` | 788 | 788 | 0 | 1 | no | no |
| `/nhl/teams/21/stats` | rendered | `/nhl/teams/21` | 731 | 731 | 0 | 1 | no | no |
| `/nhl/games/401803652` | rendered | `/nhl/games/401803652/scoring` | 83 | 83 | 0 | 0 | no | no |
| `/nhl/games/401803652` | rendered | `/nhl/games/401803652/scoring` | 59 | 59 | 0 | 0 | no | no |
| `/nhl/games/401803652/scoring` | rendered | `/nhl/games/401803652` | 85 | 85 | 0 | 0 | no | no |
| `/nhl/games/401803652/scoring` | rendered | `/nhl/games/401803652` | 83 | 83 | 0 | 0 | no | no |
| `/nhl/games/401803652/pick` | rendered | `/nhl/games/401803652` | 85 | 85 | 0 | 0 | no | no |
| `/nhl/games/401803652/pick` | rendered | `/nhl/games/401803652` | 98 | 98 | 0 | 0 | no | no |
| `/nhl/games/401892449` | rendered | `/nhl/teams/27` | 1212 | 1212 | 0 | 2 | no | no |
| `/nhl/games/401892449` | rendered | `/nhl/teams/27` | 1242 | 1242 | 0 | 2 | no | no |
| `/players` | rendered | `/nhl?tab=teams` | 687 | 687 | 0 | 1 | no | no |
| `/players` | rendered | `/nhl?tab=teams` | 680 | 680 | 0 | 1 | no | no |
| `/players?q=mar` | rendered | `/players/3852` | 702 | 702 | 0 | 1 | no | no |
| `/players?q=mar` | rendered | `/players/3852` | 706 | 706 | 0 | 1 | no | no |
| `/players/4024123` | rendered | `/nhl/teams/21` | 1412 | 1412 | 0 | 2 | no | no |
| `/players/4024123` | rendered | `/nhl/teams/21` | 1360 | 1360 | 0 | 2 | no | no |
| `/players/4024123/games` | rendered | `/nhl/games/401892434` | 1329 | 1329 | 0 | 1 | no | no |
| `/players/4024123/games` | rendered | `/nhl/games/401892434` | 1330 | 1330 | 0 | 1 | no | no |
| `/players/3067313` | rendered | `/nhl/teams/21` | 1358 | 1358 | 0 | 2 | no | no |
| `/players/3067313` | rendered | `/nhl/teams/21` | 1417 | 1417 | 0 | 2 | no | no |
| `/no-such-page` | rendered | `/` | 1842 | 2419 | 0 | 2 | no | no |
| `/no-such-page` | rendered | `/` | 1846 | 2417 | 0 | 2 | no | no |

### Every layout shift

| Route | Page | When | Score | At ms | What moved |
| --- | --- | --- | --- | --- | --- |
| `/` | rendered | load | 0.0001 | 3279 | text |
| `/` | rendered | load | 0.0001 | 3793 | a[section-nav] "Players"; a[section-nav] "Teams" |
| `/` | rendered | load | 0.0510 | 4256 | article[story] "7:00 PM ET · Scotiabank ArenaPre"; div[ledger] "Hurricanes at Canadiens: line sc"; div[ledger] "Predators at Maple Leafs: line s"; ::after[story] "" |
| `/` | rendered | scores arrive | 0.1214 | 8825 | article[story] "6:00 PM · Little Caesars ArenaSe"; div[ledger] "Senators at Red Wings: line scor"; text; td[ledger-cell] "1⁠-⁠0⁠-⁠1"; td[ledger-cell] "1⁠-⁠1⁠-⁠1" |
| `/` | rendered | load | 0.0001 | 3294 | text |
| `/` | rendered | load | 0.0001 | 3792 | a[section-nav] "Players"; a[section-nav] "Teams" |
| `/` | rendered | load | 0.0510 | 4267 | article[story] "7:00 PM ET · Scotiabank ArenaPre"; div[ledger] "Hurricanes at Canadiens: line sc"; div[ledger] "Predators at Maple Leafs: line s"; ::after[story] "" |
| `/` | rendered | scores arrive | 0.1214 | 8803 | article[story] "6:00 PM · Little Caesars ArenaSe"; div[ledger] "Senators at Red Wings: line scor"; text; td[ledger-cell] "1⁠-⁠0⁠-⁠1"; td[ledger-cell] "1⁠-⁠1⁠-⁠1" |
| `/nhl` | rendered | load | 0.0027 | 3811 | ul[score-ticker] "CAR@atMTL7:00 PM ETNSH@atTOR7:00"; a[url-tabs] "wild card"; a[section-nav] "Players"; text; a[section-nav] "Teams" |
| `/nhl` | rendered | load | 0.0007 | 4079 | text |
| `/nhl` | rendered | load | 0.0031 | 4577 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/nhl` | rendered | scores arrive | 0.0007 | 8614 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl` | rendered | load | 0.0027 | 3837 | ul[score-ticker] "CAR@atMTL7:00 PM ETNSH@atTOR7:00"; a[url-tabs] "wild card"; a[section-nav] "Players"; text; a[section-nav] "Teams" |
| `/nhl` | rendered | load | 0.0007 | 4370 | text |
| `/nhl` | rendered | load | 0.0031 | 4591 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/nhl` | rendered | scores arrive | 0.0007 | 8565 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl?tab=teams` | rendered | load | 0.0001 | 3776 | text |
| `/nhl?tab=teams` | rendered | load | 0.0003 | 3794 | ul[score-ticker] "CAR@atMTL7:00 PM ETNSH@atTOR7:00"; a[section-nav] "Players"; a[section-nav] "Teams" |
| `/nhl?tab=teams` | rendered | load | 0.0007 | 4073 | text |
| `/nhl?tab=teams` | rendered | load | 0.0031 | 4500 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/nhl?tab=teams` | rendered | scores arrive | 0.0007 | 8554 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl?tab=teams` | rendered | load | 0.0005 | 3846 | ul[score-ticker] "CAR@atMTL7:00 PM ETNSH@atTOR7:00"; text; a[section-nav] "Players"; a[section-nav] "Teams" |
| `/nhl?tab=teams` | rendered | load | 0.0007 | 4370 | text |
| `/nhl?tab=teams` | rendered | load | 0.0031 | 4697 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/nhl?tab=teams` | rendered | scores arrive | 0.0007 | 8535 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl/live` | rendered | load | 0.0003 | 3558 | ul[score-ticker] "CAR@atMTL7:00 PM ETNSH@atTOR7:00"; a[section-nav] "Players"; a[section-nav] "Teams" |
| `/nhl/live` | rendered | load | 0.0009 | 4105 | text |
| `/nhl/live` | rendered | load | 0.0031 | 4880 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/nhl/live` | rendered | load | 0.0089 | 4956 | tr[ledger-row] "NSH at TOR, 6:00 PMTOR 58%NSHNas" |
| `/nhl/live` | rendered | scores arrive | 0.0851 | 8768 | section[section] "Upcoming 7statusawayhomenoteOTT "; div[ledger] "statusawayhomenoteOTT at DET, 6:"; tr[ledger-row] "NYI at NYR, 6:30 PMNYR 53%NYIN.Y"; ::after[ledger-cell] ""; span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl/live` | rendered | load | 0.0003 | 3552 | ul[score-ticker] "CAR@atMTL7:00 PM ETNSH@atTOR7:00"; a[section-nav] "Players"; a[section-nav] "Teams" |
| `/nhl/live` | rendered | load | 0.0009 | 4089 | text |
| `/nhl/live` | rendered | load | 0.0031 | 4883 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/nhl/live` | rendered | load | 0.0089 | 4963 | tr[ledger-row] "NSH at TOR, 6:00 PMTOR 58%NSHNas" |
| `/nhl/live` | rendered | scores arrive | 0.0851 | 8759 | section[section] "Upcoming 7statusawayhomenoteOTT "; div[ledger] "statusawayhomenoteOTT at DET, 6:"; tr[ledger-row] "NYI at NYR, 6:30 PMNYR 53%NYIN.Y"; ::after[ledger-cell] ""; span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl/teams/21` | rendered | load | 0.0006 | 4131 | td[ledger-cell] "7:00 PM ETTOR 58%"; th[ledger-column] "time"; td[ledger-cell] "10:00 PM ET"; td[ledger-cell] "7:00 PM ET" |
| `/nhl/teams/21` | rendered | load | 0.0008 | 4278 | ul[score-ticker] "CAR@atMTL7:00 PM ETNSH@atTOR7:00"; text; a[section-nav] "Players"; a[section-nav] "Teams" |
| `/nhl/teams/21` | rendered | load | 0.0002 | 4377 | td[ledger-cell] "6th in Atlantic Division"; th[ledger-column] "standing" |
| `/nhl/teams/21` | rendered | load | 0.0230 | 4783 | div[page] "schedulerosterstatsUpcoming 81 g"; div[team-now] "Playing now Next gamedateopponen"; div[ledger] "dateopponenttimeTue Oct 6vs Nash"; div[ledger] "wlotlptsstanding12026th in Atlan"; div[ledger] "dateopponenttimewhereTue Oct 6vs" |
| `/nhl/teams/21` | rendered | load | 0.0031 | 5087 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/nhl/teams/21` | rendered | load | 0.0014 | 5324 | text; td[ledger-cell] "6:00 PM"; th[ledger-column] "time"; td[ledger-cell] "9:00 PM" |
| `/nhl/teams/21` | rendered | scores arrive | 0.0007 | 9002 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl/teams/21` | rendered | load | 0.0006 | 4119 | td[ledger-cell] "7:00 PM ETTOR 58%"; th[ledger-column] "time"; td[ledger-cell] "10:00 PM ET"; td[ledger-cell] "7:00 PM ET" |
| `/nhl/teams/21` | rendered | load | 0.0008 | 4268 | ul[score-ticker] "CAR@atMTL7:00 PM ETNSH@atTOR7:00"; text; a[section-nav] "Players"; a[section-nav] "Teams" |
| `/nhl/teams/21` | rendered | load | 0.0002 | 4367 | td[ledger-cell] "6th in Atlantic Division"; th[ledger-column] "standing" |
| `/nhl/teams/21` | rendered | load | 0.0230 | 4780 | div[page] "schedulerosterstatsUpcoming 81 g"; div[team-now] "Playing now Next gamedateopponen"; div[ledger] "dateopponenttimeTue Oct 6vs Nash"; div[ledger] "wlotlptsstanding12026th in Atlan"; div[ledger] "dateopponenttimewhereTue Oct 6vs" |
| `/nhl/teams/21` | rendered | load | 0.0031 | 5133 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/nhl/teams/21` | rendered | load | 0.0014 | 5388 | text; td[ledger-cell] "6:00 PM"; th[ledger-column] "time"; td[ledger-cell] "9:00 PM" |
| `/nhl/teams/21` | rendered | scores arrive | 0.0007 | 9030 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl/teams/21/roster` | rendered | load | 0.0004 | 4026 | td[ledger-cell] "7:00 PM ETTOR 58%"; th[ledger-column] "time"; text |
| `/nhl/teams/21/roster` | rendered | load | 0.0002 | 4393 | td[ledger-cell] "6th in Atlantic Division"; th[ledger-column] "standing" |
| `/nhl/teams/21/roster` | rendered | load | 0.0008 | 4414 | ul[score-ticker] "CAR@atMTL7:00 PM ETNSH@atTOR7:00"; text; a[section-nav] "Players"; a[section-nav] "Teams" |
| `/nhl/teams/21/roster` | rendered | load | 0.0230 | 4925 | div[page] "schedulerosterstatsRoster 24 pla"; div[team-now] "Playing now Next gamedateopponen"; div[ledger] "#playerpos3Nick BlankenburgD8Chr"; div[ledger] "wlotlptsstanding12026th in Atlan"; div[ledger] "dateopponenttimewhereTue Oct 6vs" |
| `/nhl/teams/21/roster` | rendered | load | 0.0031 | 5093 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/nhl/teams/21/roster` | rendered | load | 0.0003 | 5163 | text |
| `/nhl/teams/21/roster` | rendered | scores arrive | 0.0007 | 9125 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl/teams/21/roster` | rendered | load | 0.0004 | 4066 | td[ledger-cell] "7:00 PM ETTOR 58%"; th[ledger-column] "time"; text |
| `/nhl/teams/21/roster` | rendered | load | 0.0008 | 4387 | ul[score-ticker] "CAR@atMTL7:00 PM ETNSH@atTOR7:00"; text; a[section-nav] "Players"; a[section-nav] "Teams" |
| `/nhl/teams/21/roster` | rendered | load | 0.0002 | 4406 | td[ledger-cell] "6th in Atlantic Division"; th[ledger-column] "standing" |
| `/nhl/teams/21/roster` | rendered | load | 0.0230 | 4843 | div[page] "schedulerosterstatsRoster 24 pla"; div[team-now] "Playing now Next gamedateopponen"; div[ledger] "#playerpos3Nick BlankenburgD8Chr"; div[ledger] "wlotlptsstanding12026th in Atlan"; div[ledger] "dateopponenttimewhereTue Oct 6vs" |
| `/nhl/teams/21/roster` | rendered | load | 0.0031 | 5110 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/nhl/teams/21/roster` | rendered | load | 0.0003 | 5163 | text |
| `/nhl/teams/21/roster` | rendered | scores arrive | 0.0007 | 9156 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl/teams/21/stats` | rendered | load | 0.0014 | 4025 | td[ledger-cell] "7:00 PM ETTOR 58%"; th[ledger-column] "time"; td[ledger-cell] "0-0-0"; td[ledger-cell] "1-2-0"; text |
| `/nhl/teams/21/stats` | rendered | load | 0.0014 | 4405 | ul[score-ticker] "CAR@atMTL7:00 PM ETNSH@atTOR7:00"; td[ledger-cell] "6th in Atlantic Division"; th[ledger-column] "standing"; text; a[section-nav] "Players" |
| `/nhl/teams/21/stats` | rendered | load | 0.0228 | 4935 | div[page] "schedulerosterstatsSeason statsg"; div[team-now] "Playing now Next gamedateopponen"; div[ledger] "gpgfgadiffpp%pk%homeroad367-118."; div[ledger] "wlotlptsstanding12026th in Atlan"; div[ledger] "dateopponenttimewhereTue Oct 6vs" |
| `/nhl/teams/21/stats` | rendered | load | 0.0031 | 5155 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/nhl/teams/21/stats` | rendered | load | 0.0003 | 5247 | text |
| `/nhl/teams/21/stats` | rendered | scores arrive | 0.0007 | 9173 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl/teams/21/stats` | rendered | load | 0.0014 | 4000 | td[ledger-cell] "7:00 PM ETTOR 58%"; th[ledger-column] "time"; td[ledger-cell] "0-0-0"; td[ledger-cell] "1-2-0"; text |
| `/nhl/teams/21/stats` | rendered | load | 0.0002 | 4384 | td[ledger-cell] "6th in Atlantic Division"; th[ledger-column] "standing"; text |
| `/nhl/teams/21/stats` | rendered | load | 0.0008 | 4397 | ul[score-ticker] "CAR@atMTL7:00 PM ETNSH@atTOR7:00"; text; a[section-nav] "Players"; a[section-nav] "Teams" |
| `/nhl/teams/21/stats` | rendered | load | 0.0228 | 4924 | div[page] "schedulerosterstatsSeason statsg"; div[team-now] "Playing now Next gamedateopponen"; div[ledger] "gpgfgadiffpp%pk%homeroad367-118."; div[ledger] "wlotlptsstanding12026th in Atlan"; div[ledger] "dateopponenttimewhereTue Oct 6vs" |
| `/nhl/teams/21/stats` | rendered | load | 0.0031 | 5071 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/nhl/teams/21/stats` | rendered | load | 0.0003 | 5126 | text |
| `/nhl/teams/21/stats` | rendered | scores arrive | 0.0007 | 9122 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl/games/401803652` | rendered | load | 0.0001 | 4069 | text |
| `/nhl/games/401803652` | rendered | load | 0.0003 | 4467 | ul[score-ticker] "CAR@atMTL7:00 PM ETNSH@atTOR7:00"; a[section-nav] "Players"; a[section-nav] "Teams" |
| `/nhl/games/401803652` | rendered | load | 0.0007 | 4865 | text |
| `/nhl/games/401803652` | rendered | load | 0.0031 | 5587 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/nhl/games/401803652` | rendered | scores arrive | 0.0007 | 9511 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl/games/401803652` | rendered | load | 0.0001 | 4058 | text |
| `/nhl/games/401803652` | rendered | load | 0.0003 | 4441 | ul[score-ticker] "CAR@atMTL7:00 PM ETNSH@atTOR7:00"; a[section-nav] "Players"; a[section-nav] "Teams" |
| `/nhl/games/401803652` | rendered | load | 0.0007 | 4966 | text |
| `/nhl/games/401803652` | rendered | load | 0.0031 | 5543 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/nhl/games/401803652` | rendered | scores arrive | 0.0007 | 9496 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl/games/401803652/scoring` | rendered | load | 0.0001 | 4057 | text |
| `/nhl/games/401803652/scoring` | rendered | load | 0.0003 | 4389 | ul[score-ticker] "CAR@atMTL7:00 PM ETNSH@atTOR7:00"; a[section-nav] "Players"; a[section-nav] "Teams" |
| `/nhl/games/401803652/scoring` | rendered | load | 0.0007 | 4747 | text |
| `/nhl/games/401803652/scoring` | rendered | load | 0.0031 | 5467 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/nhl/games/401803652/scoring` | rendered | scores arrive | 0.0007 | 9423 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl/games/401803652/scoring` | rendered | load | 0.0001 | 4085 | text |
| `/nhl/games/401803652/scoring` | rendered | load | 0.0003 | 4451 | ul[score-ticker] "CAR@atMTL7:00 PM ETNSH@atTOR7:00"; a[section-nav] "Players"; a[section-nav] "Teams" |
| `/nhl/games/401803652/scoring` | rendered | load | 0.0007 | 4970 | text |
| `/nhl/games/401803652/scoring` | rendered | load | 0.0031 | 5710 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/nhl/games/401803652/scoring` | rendered | scores arrive | 0.0007 | 9488 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl/games/401803652/pick` | rendered | load | 0.0001 | 4657 | text |
| `/nhl/games/401803652/pick` | rendered | load | 0.0003 | 4824 | ul[score-ticker] "CAR@atMTL7:00 PM ETNSH@atTOR7:00"; a[section-nav] "Players"; a[section-nav] "Teams" |
| `/nhl/games/401803652/pick` | rendered | load | 0.0007 | 5192 | text |
| `/nhl/games/401803652/pick` | rendered | load | 0.0031 | 6015 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/nhl/games/401803652/pick` | rendered | scores arrive | 0.0007 | 9883 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl/games/401803652/pick` | rendered | load | 0.0001 | 4656 | text |
| `/nhl/games/401803652/pick` | rendered | load | 0.0003 | 4818 | ul[score-ticker] "CAR@atMTL7:00 PM ETNSH@atTOR7:00"; a[section-nav] "Players"; a[section-nav] "Teams" |
| `/nhl/games/401803652/pick` | rendered | load | 0.0007 | 5198 | text |
| `/nhl/games/401803652/pick` | rendered | load | 0.0031 | 6012 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/nhl/games/401803652/pick` | rendered | scores arrive | 0.0007 | 9888 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl/games/401892449` | rendered | load | 0.0000 | 4642 | text |
| `/nhl/games/401892449` | rendered | load | 0.0003 | 4809 | ul[score-ticker] "CAR@atMTL7:00 PM ETNSH@atTOR7:00"; a[section-nav] "Players"; a[section-nav] "Teams" |
| `/nhl/games/401892449` | rendered | load | 0.0230 | 5193 | div[game-matchup] "away · 1-1-0NSH1-1-0Tue Oct 67:0"; div[game-story] "Predators at Maple Leafs: line s"; div[ledger] "Predators at Maple Leafs: line s"; text; p[deck] "The Predators (1⁠-⁠1⁠-⁠0) visit " |
| `/nhl/games/401892449` | rendered | load | 0.0031 | 5903 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/nhl/games/401892449` | rendered | load | 0.0001 | 5964 | text |
| `/nhl/games/401892449` | rendered | scores arrive | 0.0007 | 9876 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl/games/401892449` | rendered | load | 0.0000 | 4279 | text |
| `/nhl/games/401892449` | rendered | load | 0.0003 | 4510 | ul[score-ticker] "CAR@atMTL7:00 PM ETNSH@atTOR7:00"; a[section-nav] "Players"; a[section-nav] "Teams" |
| `/nhl/games/401892449` | rendered | load | 0.0230 | 4977 | div[game-matchup] "away · 1-1-0NSH1-1-0Tue Oct 67:0"; div[game-story] "Predators at Maple Leafs: line s"; div[ledger] "Predators at Maple Leafs: line s"; text; p[deck] "The Predators (1⁠-⁠1⁠-⁠0) visit " |
| `/nhl/games/401892449` | rendered | load | 0.0031 | 5568 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/nhl/games/401892449` | rendered | load | 0.0001 | 5632 | text |
| `/nhl/games/401892449` | rendered | scores arrive | 0.0007 | 9436 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/players` | rendered | load | 0.0003 | 3336 | text; ::after[page] "" |
| `/players` | rendered | load | 0.0003 | 3718 | ul[score-ticker] "CAR@atMTL7:00 PM ETNSH@atTOR7:00"; a[section-nav] "Players"; a[section-nav] "Teams" |
| `/players` | rendered | load | 0.0008 | 4048 | text |
| `/players` | rendered | load | 0.0031 | 4488 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/players` | rendered | scores arrive | 0.0007 | 8412 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/players` | rendered | load | 0.0003 | 3502 | text; ::after[page] "" |
| `/players` | rendered | load | 0.0003 | 3667 | ul[score-ticker] "CAR@atMTL7:00 PM ETNSH@atTOR7:00"; a[section-nav] "Players"; a[section-nav] "Teams" |
| `/players` | rendered | load | 0.0008 | 4196 | text |
| `/players` | rendered | load | 0.0031 | 4368 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/players` | rendered | scores arrive | 0.0007 | 8403 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/players?q=mar` | rendered | load | 0.0003 | 3711 | ul[score-ticker] "CAR@atMTL7:00 PM ETNSH@atTOR7:00"; a[section-nav] "Players"; a[section-nav] "Teams" |
| `/players?q=mar` | rendered | load | 0.0015 | 3744 | text |
| `/players?q=mar` | rendered | load | 0.0008 | 4050 | text |
| `/players?q=mar` | rendered | load | 0.0031 | 4486 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/players?q=mar` | rendered | scores arrive | 0.0007 | 8399 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/players?q=mar` | rendered | load | 0.0003 | 3615 | ul[score-ticker] "CAR@atMTL7:00 PM ETNSH@atTOR7:00"; a[section-nav] "Players"; a[section-nav] "Teams" |
| `/players?q=mar` | rendered | load | 0.0015 | 3701 | text |
| `/players?q=mar` | rendered | load | 0.0008 | 4016 | text |
| `/players?q=mar` | rendered | load | 0.0031 | 4382 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/players?q=mar` | rendered | scores arrive | 0.0007 | 8408 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/players/4024123` | rendered | load | 0.0036 | 3529 | ::after[page-count] ""; text; td[ledger-cell] "T-195th"; td[ledger-cell] "1"; td[ledger-cell] "0" |
| `/players/4024123` | rendered | load | 0.0003 | 3891 | ul[score-ticker] "CAR@atMTL7:00 PM ETNSH@atTOR7:00"; a[section-nav] "Players"; a[section-nav] "Teams" |
| `/players/4024123` | rendered | load | 0.0003 | 3976 | td[ledger-cell] "1"; td[ledger-cell] "6"; td[ledger-cell] "0"; td[ledger-cell] "3" |
| `/players/4024123` | rendered | load | 0.0007 | 4357 | text |
| `/players/4024123` | rendered | load | 0.0031 | 4742 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/players/4024123` | rendered | scores arrive | 0.0007 | 8654 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/players/4024123` | rendered | load | 0.0036 | 3698 | ::after[page-count] ""; text; td[ledger-cell] "T-195th"; td[ledger-cell] "1"; td[ledger-cell] "0" |
| `/players/4024123` | rendered | load | 0.0003 | 3878 | td[ledger-cell] "1"; td[ledger-cell] "6"; td[ledger-cell] "0"; td[ledger-cell] "3" |
| `/players/4024123` | rendered | load | 0.0003 | 3897 | ul[score-ticker] "CAR@atMTL7:00 PM ETNSH@atTOR7:00"; a[section-nav] "Players"; a[section-nav] "Teams" |
| `/players/4024123` | rendered | load | 0.0007 | 4383 | text |
| `/players/4024123` | rendered | load | 0.0031 | 4586 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/players/4024123` | rendered | scores arrive | 0.0007 | 8612 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/players/4024123/games` | rendered | load | 0.0036 | 3525 | ::after[page-count] ""; text; td[ledger-cell] "T-195th"; td[ledger-cell] "1"; td[ledger-cell] "0" |
| `/players/4024123/games` | rendered | load | 0.0003 | 3887 | ul[score-ticker] "CAR@atMTL7:00 PM ETNSH@atTOR7:00"; a[section-nav] "Players"; a[section-nav] "Teams" |
| `/players/4024123/games` | rendered | load | 0.0003 | 3954 | td[ledger-cell] "1"; td[ledger-cell] "6"; td[ledger-cell] "0"; th[ledger-column] "SOG" |
| `/players/4024123/games` | rendered | load | 0.0007 | 4350 | text |
| `/players/4024123/games` | rendered | load | 0.0031 | 4719 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/players/4024123/games` | rendered | scores arrive | 0.0007 | 8615 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/players/4024123/games` | rendered | load | 0.0036 | 3676 | ::after[page-count] ""; text; td[ledger-cell] "T-195th"; td[ledger-cell] "1"; td[ledger-cell] "0" |
| `/players/4024123/games` | rendered | load | 0.0003 | 3891 | td[ledger-cell] "1"; td[ledger-cell] "6"; td[ledger-cell] "0"; th[ledger-column] "SOG" |
| `/players/4024123/games` | rendered | load | 0.0003 | 3911 | ul[score-ticker] "CAR@atMTL7:00 PM ETNSH@atTOR7:00"; a[section-nav] "Players"; a[section-nav] "Teams" |
| `/players/4024123/games` | rendered | load | 0.0007 | 4384 | text |
| `/players/4024123/games` | rendered | load | 0.0031 | 4587 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/players/4024123/games` | rendered | scores arrive | 0.0007 | 8622 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/players/3067313` | rendered | load | 0.0014 | 3507 | ::after[page-count] ""; text; div[player-header] "birthplaceEdison, NJ"; td[ledger-cell] "T-9th"; td[ledger-cell] "0" |
| `/players/3067313` | rendered | load | 0.0003 | 3874 | ul[score-ticker] "CAR@atMTL7:00 PM ETNSH@atTOR7:00"; a[section-nav] "Players"; a[section-nav] "Teams" |
| `/players/3067313` | rendered | load | 0.0000 | 3941 | div[player-header] "weight257 lbs"; text |
| `/players/3067313` | rendered | load | 0.0007 | 4332 | text |
| `/players/3067313` | rendered | load | 0.0031 | 4627 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/players/3067313` | rendered | scores arrive | 0.0007 | 8596 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/players/3067313` | rendered | load | 0.0014 | 3520 | ::after[page-count] ""; text; div[player-header] "birthplaceEdison, NJ"; td[ledger-cell] "T-9th"; td[ledger-cell] "0" |
| `/players/3067313` | rendered | load | 0.0003 | 3885 | ul[score-ticker] "CAR@atMTL7:00 PM ETNSH@atTOR7:00"; a[section-nav] "Players"; a[section-nav] "Teams" |
| `/players/3067313` | rendered | load | 0.0000 | 3949 | div[player-header] "weight257 lbs"; text |
| `/players/3067313` | rendered | load | 0.0007 | 4342 | text |
| `/players/3067313` | rendered | load | 0.0031 | 4708 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/players/3067313` | rendered | scores arrive | 0.0007 | 8611 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/no-such-page` | rendered | load | 0.0003 | 2944 | text; ::after[page] "" |
| `/no-such-page` | rendered | load | 0.0031 | 3071 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/no-such-page` | rendered | load | 0.0003 | 3322 | ul[score-ticker] "favorite team, NSH@atTOR6:00 PMC"; a[section-nav] "Players"; a[section-nav] "Teams" |
| `/no-such-page` | rendered | load | 0.0007 | 3838 | text |
| `/no-such-page` | rendered | scores arrive | 0.0007 | 7747 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/no-such-page` | rendered | load | 0.0003 | 2933 | text; ::after[page] "" |
| `/no-such-page` | rendered | load | 0.0031 | 3058 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/no-such-page` | rendered | load | 0.0003 | 3315 | ul[score-ticker] "favorite team, NSH@atTOR6:00 PMC"; a[section-nav] "Players"; a[section-nav] "Teams" |
| `/no-such-page` | rendered | load | 0.0007 | 3831 | text |
| `/no-such-page` | rendered | scores arrive | 0.0007 | 7737 | span[dateline] "9 games · 1 live · 1 final · Pic" |

### Paint and hydration

| Route | Page | First paint ms | Largest paint ms | Site's own hydration mark ms | Every control hydrated ms | The largest element |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | rendered | 1576 | 1576 | 5031 | 5179 | h1[wordmark] "Yogan Hockey" |
| `/` | rendered | 1568 | 1568 | 5021 | 5137 | h1[wordmark] "Yogan Hockey" |
| `/nhl` | rendered | 1560 | 1560 | 4514 | 4676 | p[wordmark] "Yogan Hockey" |
| `/nhl` | rendered | 1580 | 1580 | 4516 | 4676 | p[wordmark] "Yogan Hockey" |
| `/nhl?tab=teams` | rendered | 1556 | 1556 | 4506 | 4649 | p[wordmark] "Yogan Hockey" |
| `/nhl?tab=teams` | rendered | 1552 | 1552 | 4457 | 4541 | p[wordmark] "Yogan Hockey" |
| `/nhl/live` | rendered | 1560 | 1560 | 4789 | 4883 | p[wordmark] "Yogan Hockey" |
| `/nhl/live` | rendered | 1560 | 1560 | 4794 | 4957 | p[wordmark] "Yogan Hockey" |
| `/nhl/teams/21` | rendered | 1580 | 1580 | 5016 | 5236 | p[wordmark] "Yogan Hockey" |
| `/nhl/teams/21` | rendered | 1584 | 1584 | 5028 | 5379 | p[wordmark] "Yogan Hockey" |
| `/nhl/teams/21/roster` | rendered | 1548 | 1548 | 5032 | 5159 | p[wordmark] "Yogan Hockey" |
| `/nhl/teams/21/roster` | rendered | 1548 | 1548 | 5047 | 5160 | p[wordmark] "Yogan Hockey" |
| `/nhl/teams/21/stats` | rendered | 1556 | 1556 | 5062 | 5222 | p[wordmark] "Yogan Hockey" |
| `/nhl/teams/21/stats` | rendered | 1552 | 1552 | 5051 | 5219 | p[wordmark] "Yogan Hockey" |
| `/nhl/games/401803652` | rendered | 1592 | 1592 | 5508 | 5691 | p[wordmark] "Yogan Hockey" |
| `/nhl/games/401803652` | rendered | 1560 | 1560 | 5516 | 5657 | p[wordmark] "Yogan Hockey" |
| `/nhl/games/401803652/scoring` | rendered | 1564 | 1564 | 5479 | 5682 | p[wordmark] "Yogan Hockey" |
| `/nhl/games/401803652/scoring` | rendered | 1596 | 1596 | 5636 | 5766 | p[wordmark] "Yogan Hockey" |
| `/nhl/games/401803652/pick` | rendered | 1540 | 1540 | 5910 | 6111 | p[wordmark] "Yogan Hockey" |
| `/nhl/games/401803652/pick` | rendered | 1528 | 1528 | 5907 | 6097 | p[wordmark] "Yogan Hockey" |
| `/nhl/games/401892449` | rendered | 1548 | 1548 | 5843 | 5999 | p[wordmark] "Yogan Hockey" |
| `/nhl/games/401892449` | rendered | 1532 | 1532 | 5790 | 5998 | p[wordmark] "Yogan Hockey" |
| `/players` | rendered | 1560 | 1560 | 4401 | 4523 | p[wordmark] "Yogan Hockey" |
| `/players` | rendered | 1560 | 1560 | 4358 | 4468 | p[wordmark] "Yogan Hockey" |
| `/players?q=mar` | rendered | 1572 | 1572 | 4396 | 4552 | p[wordmark] "Yogan Hockey" |
| `/players?q=mar` | rendered | 1564 | 1564 | 4289 | 4442 | p[wordmark] "Yogan Hockey" |
| `/players/4024123` | rendered | 1572 | 1572 | 4645 | 4807 | p[wordmark] "Yogan Hockey" |
| `/players/4024123` | rendered | 1572 | 1572 | 4615 | 4786 | p[wordmark] "Yogan Hockey" |
| `/players/4024123/games` | rendered | 1576 | 1576 | 4624 | 4784 | p[wordmark] "Yogan Hockey" |
| `/players/4024123/games` | rendered | 1572 | 1572 | 4626 | 4752 | p[wordmark] "Yogan Hockey" |
| `/players/3067313` | rendered | 1576 | 1576 | 4632 | 4790 | p[wordmark] "Yogan Hockey" |
| `/players/3067313` | rendered | 1568 | 1568 | 4632 | 4797 | p[wordmark] "Yogan Hockey" |
| `/no-such-page` | rendered | 1548 | 1548 | 3025 | 3025 | p[wordmark] "Yogan Hockey" |
| `/no-such-page` | rendered | 1556 | 1556 | 3017 | 3017 | p[wordmark] "Yogan Hockey" |

