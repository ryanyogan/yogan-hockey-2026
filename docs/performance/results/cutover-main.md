<!-- Written by scripts/measure-performance.ts. Do not edit: measure again. -->

Measured 2026-10-12T18:21:10.080Z to 2026-10-12T19:53:35.688Z against `http://localhost:5350` (304479b ADR 0009: the Cloudflare tooling stays cf, which Clo), 3 runs a route, on AMD Ryzen AI 9 HX 370 w/ Radeon 890M x 24, linux, its load 1.9 as the run began and 4.2 as it ended.

## Every route against every budget

| Route | Page | First paint ms | Largest paint ms (budget) | Shift on load | Shift as scores arrive | Slowest tap ms | Next shell ms | Blank frames | View transition | Script gzip kB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | rendered (none) | 2512 | **2512** ✗ (2500) | 0.0000 | **0.1214** ✗ | 56 (theme toggle) | **696** ✗ | 0 | no | 245.8 |
| `/nhl` | cached (hit) | 2480 | **2480** ✗ (1500) | 0.0000 | **0.0007** ✗ | 48 (theme toggle) | **760** ✗ | 0 | no | 232.6 |
| `/nhl` | rendered (bypass) | 2496 | 2496 (2500) | 0.0000 | **0.0007** ✗ | 72 (theme toggle) | **702** ✗ | 0 | no | 232.6 |
| `/nhl?tab=teams` | cached (hit) | 2448 | **2448** ✗ (1500) | 0.0000 | **0.0007** ✗ | 56 (theme toggle) | **752** ✗ | 0 | no | 232.6 |
| `/nhl?tab=teams` | rendered (bypass) | 2444 | 2444 (2500) | 0.0000 | **0.0007** ✗ | 48 (theme toggle) | **702** ✗ | 0 | no | 232.6 |
| `/nhl/live` | rendered (none) | 2488 | 2488 (2500) | **0.0031** ✗ | **0.0851** ✗ | 64 (open the whole slate) | **682** ✗ | 0 | no | 239.9 |
| `/nhl/teams/21` | cached (hit) | 2468 | **2468** ✗ (1500) | **0.0009** ✗ | **0.0007** ✗ | 64 (theme toggle) | **677** ✗ | 0 | no | 238.0 |
| `/nhl/teams/21` | rendered (bypass) | 2480 | 2480 (2500) | **0.0009** ✗ | **0.0007** ✗ | 64 (theme toggle) | **664** ✗ | 0 | no | 238.0 |
| `/nhl/teams/21/roster` | cached (hit) | 2492 | **2492** ✗ (1500) | 0.0000 | **0.0007** ✗ | 48 (theme toggle) | **726** ✗ | 0 | no | 238.0 |
| `/nhl/teams/21/roster` | rendered (bypass) | 2488 | 2488 (2500) | 0.0000 | **0.0007** ✗ | 48 (theme toggle) | **747** ✗ | 0 | no | 238.0 |
| `/nhl/teams/21/stats` | cached (hit) | 2484 | **2484** ✗ (1500) | 0.0000 | **0.0007** ✗ | 48 (theme toggle) | **717** ✗ | 0 | no | 238.0 |
| `/nhl/teams/21/stats` | rendered (bypass) | 2484 | 2484 (2500) | 0.0000 | **0.0007** ✗ | 48 (theme toggle) | **696** ✗ | 0 | no | 238.0 |
| `/nhl/games/401803652` | cached (hit) | 2476 | **2476** ✗ (1500) | 0.0000 | **0.0007** ✗ | 80 (theme toggle) | **735** ✗ | 0 | no | **254.3** ✗ |
| `/nhl/games/401803652` | rendered (bypass) | 2472 | 2472 (2500) | 0.0000 | **0.0007** ✗ | 80 (theme toggle) | **766** ✗ | 0 | no | **254.3** ✗ |
| `/nhl/games/401803652/scoring` | cached (hit) | 2452 | **2452** ✗ (1500) | 0.0000 | **0.0007** ✗ | 80 (theme toggle) | **747** ✗ | 0 | no | **254.3** ✗ |
| `/nhl/games/401803652/scoring` | rendered (bypass) | 2448 | 2448 (2500) | 0.0000 | **0.0007** ✗ | 72 (theme toggle) | **722** ✗ | 0 | no | **254.3** ✗ |
| `/nhl/games/401803652/pick` | cached (hit) | 2460 | **2460** ✗ (1500) | 0.0000 | **0.0007** ✗ | 72 (theme toggle) | **756** ✗ | 0 | no | **254.3** ✗ |
| `/nhl/games/401803652/pick` | rendered (bypass) | 2464 | 2464 (2500) | 0.0000 | **0.0007** ✗ | 56 (theme toggle) | **750** ✗ | 0 | no | **254.3** ✗ |
| `/nhl/games/401892449` | rendered (miss) | 2492 | 2492 (2500) | 0.0000 | **0.0007** ✗ | 64 (theme toggle) | **701** ✗ | 0 | no | **254.3** ✗ |
| `/players` | cached (hit) | 2404 | **2404** ✗ (1500) | 0.0000 | **0.0007** ✗ | 64 (open the whole slate) | **687** ✗ | 0 | no | 239.7 |
| `/players` | rendered (bypass) | 2396 | 2396 (2500) | 0.0000 | **0.0007** ✗ | 48 (theme toggle) | **673** ✗ | 0 | no | 239.7 |
| `/players?q=mar` | rendered (bypass) | 2448 | 2448 (2500) | 0.0000 | **0.0007** ✗ | 64 (theme toggle) | **724** ✗ | 0 | no | 239.7 |
| `/players/4024123` | cached (hit) | 2472 | **2472** ✗ (1500) | 0.0000 | **0.0007** ✗ | 72 (theme toggle) | **1399** ✗ | 0 | no | 233.3 |
| `/players/4024123` | rendered (bypass) | 2484 | 2484 (2500) | 0.0000 | **0.0007** ✗ | 72 (theme toggle) | **1407** ✗ | 0 | no | 233.3 |
| `/players/4024123/games` | cached (hit) | 2508 | **2508** ✗ (1500) | 0.0000 | **0.0007** ✗ | 72 (theme toggle) | **653** ✗ | 0 | no | 233.3 |
| `/players/4024123/games` | rendered (bypass) | 2508 | **2508** ✗ (2500) | 0.0000 | **0.0007** ✗ | 72 (theme toggle) | **662** ✗ | 0 | no | 233.3 |
| `/players/3067313` | cached (hit) | 2524 | **2524** ✗ (1500) | 0.0000 | **0.0007** ✗ | 64 (theme toggle) | **1345** ✗ | 0 | no | 233.3 |
| `/players/3067313` | rendered (bypass) | 2492 | 2492 (2500) | 0.0000 | **0.0007** ✗ | 72 (theme toggle) | **1403** ✗ | 0 | no | 233.3 |
| `/no-such-page` | rendered (none) | 1636 | 1636 (2500) | **0.0038** ✗ | **0.0007** ✗ | 48 (open the whole slate) | **3013** ✗ | 0 | no | 230.0 |

## What each route sends

| Route | Script files | Script kB | Script gzip kB | **Script budget, gzip kB** | Document kB | Document gzip kB | Stylesheet gzip kB |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 47 | 806.9 | 245.8 | **252** | 127.7 | 14.2 | 21.3 |
| `/nhl` | 31 | 778.4 | 232.6 | **244** | 172.9 | 12.9 | 21.3 |
| `/nhl?tab=teams` | 31 | 778.4 | 232.6 | **244** | 77.2 | 10.7 | 21.3 |
| `/nhl/live` | 39 | 794.8 | 239.9 | **247** | 173.5 | 15.7 | 21.3 |
| `/nhl/teams/21` | 39 | 790.1 | 238.0 | **249** | 353.0 | 21.9 | 21.3 |
| `/nhl/teams/21/roster` | 39 | 790.1 | 238.0 | **249** | 186.3 | 16.1 | 21.3 |
| `/nhl/teams/21/stats` | 39 | 790.1 | 238.0 | **249** | 106.0 | 12.6 | 21.3 |
| `/nhl/games/401803652` | 41 | 836.6 | **254.3** ✗ | **253** | 355.1 | 33.4 | 21.3 |
| `/nhl/games/401803652/scoring` | 41 | 836.6 | **254.3** ✗ | **253** | 320.9 | 32.3 | 21.3 |
| `/nhl/games/401803652/pick` | 41 | 836.6 | **254.3** ✗ | **253** | 315.2 | 32.3 | 21.3 |
| `/nhl/games/401892449` | 41 | 836.6 | **254.3** ✗ | **253** | 154.8 | 17.5 | 21.3 |
| `/players` | 39 | 793.5 | 239.7 | **251** | 47.8 | 7.5 | 21.3 |
| `/players?q=mar` | 39 | 793.5 | 239.7 | **251** | 69.5 | 10.2 | 21.3 |
| `/players/4024123` | 32 | 779.6 | 233.3 | **245** | 175.2 | 14.9 | 21.3 |
| `/players/4024123/games` | 32 | 779.6 | 233.3 | **245** | 175.6 | 15.0 | 21.3 |
| `/players/3067313` | 32 | 779.6 | 233.3 | **245** | 160.6 | 14.5 | 21.3 |
| `/no-such-page` | 27 | 773.0 | 230.0 | **231** | 90.0 | 10.7 | 10.7 |

## Detail

### Errors the pages logged

| Route | Page | Error |
| --- | --- | --- |
| `/no-such-page` | rendered | Failed to load resource: the server responded with a status of 404 (Not Found) |

### Every tap

| Route | Page | Tap | ms to next paint |
| --- | --- | --- | --- |
| `/` | rendered | theme toggle | 56 |
| `/` | rendered | open the whole slate | n/a |
| `/nhl` | cached | theme toggle | 48 |
| `/nhl` | cached | open the whole slate | 48 |
| `/nhl` | rendered | theme toggle | 72 |
| `/nhl` | rendered | open the whole slate | 64 |
| `/nhl?tab=teams` | cached | theme toggle | 56 |
| `/nhl?tab=teams` | cached | open the whole slate | 56 |
| `/nhl?tab=teams` | rendered | theme toggle | 48 |
| `/nhl?tab=teams` | rendered | open the whole slate | 48 |
| `/nhl/live` | rendered | theme toggle | 48 |
| `/nhl/live` | rendered | open the whole slate | 64 |
| `/nhl/teams/21` | cached | theme toggle | 64 |
| `/nhl/teams/21` | cached | open the whole slate | 56 |
| `/nhl/teams/21` | cached | favorite heart | 40 |
| `/nhl/teams/21` | rendered | theme toggle | 64 |
| `/nhl/teams/21` | rendered | open the whole slate | 48 |
| `/nhl/teams/21` | rendered | favorite heart | 40 |
| `/nhl/teams/21/roster` | cached | theme toggle | 48 |
| `/nhl/teams/21/roster` | cached | open the whole slate | 48 |
| `/nhl/teams/21/roster` | cached | favorite heart | 40 |
| `/nhl/teams/21/roster` | rendered | theme toggle | 48 |
| `/nhl/teams/21/roster` | rendered | open the whole slate | 48 |
| `/nhl/teams/21/roster` | rendered | favorite heart | 40 |
| `/nhl/teams/21/stats` | cached | theme toggle | 48 |
| `/nhl/teams/21/stats` | cached | open the whole slate | 48 |
| `/nhl/teams/21/stats` | cached | favorite heart | 40 |
| `/nhl/teams/21/stats` | rendered | theme toggle | 48 |
| `/nhl/teams/21/stats` | rendered | open the whole slate | 48 |
| `/nhl/teams/21/stats` | rendered | favorite heart | 40 |
| `/nhl/games/401803652` | cached | theme toggle | 80 |
| `/nhl/games/401803652` | cached | open the whole slate | 56 |
| `/nhl/games/401803652` | cached | select a goal on the timeline | 64 |
| `/nhl/games/401803652` | rendered | theme toggle | 80 |
| `/nhl/games/401803652` | rendered | open the whole slate | 72 |
| `/nhl/games/401803652` | rendered | select a goal on the timeline | 72 |
| `/nhl/games/401803652/scoring` | cached | theme toggle | 80 |
| `/nhl/games/401803652/scoring` | cached | open the whole slate | 48 |
| `/nhl/games/401803652/scoring` | cached | select a goal on the timeline | 56 |
| `/nhl/games/401803652/scoring` | rendered | theme toggle | 72 |
| `/nhl/games/401803652/scoring` | rendered | open the whole slate | 64 |
| `/nhl/games/401803652/scoring` | rendered | select a goal on the timeline | 64 |
| `/nhl/games/401803652/pick` | cached | theme toggle | 72 |
| `/nhl/games/401803652/pick` | cached | open the whole slate | 64 |
| `/nhl/games/401803652/pick` | cached | select a goal on the timeline | 64 |
| `/nhl/games/401803652/pick` | rendered | theme toggle | 56 |
| `/nhl/games/401803652/pick` | rendered | open the whole slate | 48 |
| `/nhl/games/401803652/pick` | rendered | select a goal on the timeline | 48 |
| `/nhl/games/401892449` | rendered | theme toggle | 64 |
| `/nhl/games/401892449` | rendered | open the whole slate | 64 |
| `/players` | cached | theme toggle | 56 |
| `/players` | cached | open the whole slate | 64 |
| `/players` | cached | type in the search | 32 |
| `/players` | rendered | theme toggle | 48 |
| `/players` | rendered | open the whole slate | 48 |
| `/players` | rendered | type in the search | 16 |
| `/players?q=mar` | rendered | theme toggle | 64 |
| `/players?q=mar` | rendered | open the whole slate | 64 |
| `/players?q=mar` | rendered | favorite heart | 32 |
| `/players/4024123` | cached | theme toggle | 72 |
| `/players/4024123` | cached | open the whole slate | 64 |
| `/players/4024123` | cached | favorite heart | 32 |
| `/players/4024123` | rendered | theme toggle | 72 |
| `/players/4024123` | rendered | open the whole slate | 64 |
| `/players/4024123` | rendered | favorite heart | 32 |
| `/players/4024123/games` | cached | theme toggle | 72 |
| `/players/4024123/games` | cached | open the whole slate | 48 |
| `/players/4024123/games` | cached | favorite heart | 32 |
| `/players/4024123/games` | rendered | theme toggle | 72 |
| `/players/4024123/games` | rendered | open the whole slate | 72 |
| `/players/4024123/games` | rendered | favorite heart | 32 |
| `/players/3067313` | cached | theme toggle | 64 |
| `/players/3067313` | cached | open the whole slate | 64 |
| `/players/3067313` | cached | favorite heart | 32 |
| `/players/3067313` | rendered | theme toggle | 72 |
| `/players/3067313` | rendered | open the whole slate | 64 |
| `/players/3067313` | rendered | favorite heart | 32 |
| `/no-such-page` | rendered | theme toggle | 40 |
| `/no-such-page` | rendered | open the whole slate | 48 |

### Every navigation

| From | Page | To | Shell ms | Content ms | Blank frames | Requests after the tap | Whole document loaded | Arrived at not-found |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | rendered | `/nhl/games/401891815` | 696 | 696 | 0 | 1 | no | no |
| `/nhl` | cached | `/nhl/teams/14` | 760 | 760 | 0 | 1 | no | no |
| `/nhl` | rendered | `/nhl/teams/14` | 702 | 702 | 0 | 1 | no | no |
| `/nhl?tab=teams` | cached | `/nhl/teams/25` | 752 | 752 | 0 | 1 | no | no |
| `/nhl?tab=teams` | rendered | `/nhl/teams/25` | 702 | 702 | 0 | 1 | no | no |
| `/nhl/live` | rendered | `/nhl/games/401892449` | 682 | 1346 | 0 | 1 | no | no |
| `/nhl/teams/21` | cached | `/nhl/teams/21/roster` | 677 | 677 | 0 | 1 | no | no |
| `/nhl/teams/21` | rendered | `/nhl/teams/21/roster` | 664 | 664 | 0 | 1 | no | no |
| `/nhl/teams/21/roster` | cached | `/players/4781550` | 726 | 726 | 0 | 1 | no | no |
| `/nhl/teams/21/roster` | rendered | `/players/4781550` | 747 | 747 | 0 | 1 | no | no |
| `/nhl/teams/21/stats` | cached | `/nhl/teams/21` | 717 | 1043 | 0 | 1 | no | no |
| `/nhl/teams/21/stats` | rendered | `/nhl/teams/21` | 696 | 1010 | 0 | 1 | no | no |
| `/nhl/games/401803652` | cached | `/nhl/games/401803652/scoring` | 735 | 735 | 0 | 1 | no | no |
| `/nhl/games/401803652` | rendered | `/nhl/games/401803652/scoring` | 766 | 766 | 0 | 1 | no | no |
| `/nhl/games/401803652/scoring` | cached | `/nhl/games/401803652` | 747 | 747 | 0 | 1 | no | no |
| `/nhl/games/401803652/scoring` | rendered | `/nhl/games/401803652` | 722 | 722 | 0 | 1 | no | no |
| `/nhl/games/401803652/pick` | cached | `/nhl/games/401803652` | 756 | 756 | 0 | 1 | no | no |
| `/nhl/games/401803652/pick` | rendered | `/nhl/games/401803652` | 750 | 750 | 0 | 1 | no | no |
| `/nhl/games/401892449` | rendered | `/nhl/teams/27` | 701 | 701 | 0 | 1 | no | no |
| `/players` | cached | `/nhl?tab=teams` | 687 | 687 | 0 | 1 | no | no |
| `/players` | rendered | `/nhl?tab=teams` | 673 | 673 | 0 | 1 | no | no |
| `/players?q=mar` | rendered | `/players/3852` | 724 | 724 | 0 | 1 | no | no |
| `/players/4024123` | cached | `/nhl/teams/21` | 1399 | 1804 | 0 | 1 | no | no |
| `/players/4024123` | rendered | `/nhl/teams/21` | 1407 | 1803 | 0 | 1 | no | no |
| `/players/4024123/games` | cached | `/nhl/games/401892434` | 653 | 653 | 0 | 1 | no | no |
| `/players/4024123/games` | rendered | `/nhl/games/401892434` | 662 | 662 | 0 | 1 | no | no |
| `/players/3067313` | cached | `/nhl/teams/21` | 1345 | 1803 | 0 | 1 | no | no |
| `/players/3067313` | rendered | `/nhl/teams/21` | 1403 | 1805 | 0 | 1 | no | no |
| `/no-such-page` | rendered | `/` | 3013 | 4148 | 0 | 2 | no | no |

### Every layout shift

| Route | Page | When | Score | At ms | What moved |
| --- | --- | --- | --- | --- | --- |
| `/` | rendered | scores arrive | 0.1214 | 11656 | article[story] "6:00 PM · Little Caesars ArenaSe"; div[ledger] "Senators at Red Wings: line scor"; text; td[ledger-cell] "1⁠-⁠0⁠-⁠1"; td[ledger-cell] "1⁠-⁠1⁠-⁠1" |
| `/nhl` | cached | scores arrive | 0.0007 | 9545 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl` | rendered | scores arrive | 0.0007 | 9656 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl?tab=teams` | cached | scores arrive | 0.0007 | 9524 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl?tab=teams` | rendered | scores arrive | 0.0007 | 9514 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl/live` | rendered | load | 0.0031 | 7645 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/nhl/live` | rendered | scores arrive | 0.0851 | 10992 | section[section] "Upcoming 7statusawayhomenoteOTT "; div[ledger] "statusawayhomenoteOTT at DET, 6:"; tr[ledger-row] "NYI at NYR, 6:30 PMNYR 53%NYIN.Y"; ::after[ledger-cell] ""; span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl/teams/21` | cached | load | 0.0009 | 6766 | td[ledger-cell] "6:00 PM"; th[ledger-column] "time"; td[ledger-cell] "9:00 PM" |
| `/nhl/teams/21` | cached | scores arrive | 0.0007 | 10326 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl/teams/21` | rendered | load | 0.0009 | 6717 | td[ledger-cell] "6:00 PM"; th[ledger-column] "time"; td[ledger-cell] "9:00 PM" |
| `/nhl/teams/21` | rendered | scores arrive | 0.0007 | 10283 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl/teams/21/roster` | cached | scores arrive | 0.0007 | 10495 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl/teams/21/roster` | rendered | scores arrive | 0.0007 | 10382 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl/teams/21/stats` | cached | scores arrive | 0.0007 | 10489 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl/teams/21/stats` | rendered | scores arrive | 0.0007 | 10373 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl/games/401803652` | cached | scores arrive | 0.0007 | 9479 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl/games/401803652` | rendered | scores arrive | 0.0007 | 9425 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl/games/401803652/scoring` | cached | scores arrive | 0.0007 | 9405 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl/games/401803652/scoring` | rendered | scores arrive | 0.0007 | 9420 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl/games/401803652/pick` | cached | scores arrive | 0.0007 | 9924 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl/games/401803652/pick` | rendered | scores arrive | 0.0007 | 9847 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/nhl/games/401892449` | rendered | scores arrive | 0.0007 | 9904 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/players` | cached | scores arrive | 0.0007 | 10701 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/players` | rendered | scores arrive | 0.0007 | 10651 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/players?q=mar` | rendered | scores arrive | 0.0007 | 10676 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/players/4024123` | cached | scores arrive | 0.0007 | 9689 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/players/4024123` | rendered | scores arrive | 0.0007 | 9686 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/players/4024123/games` | cached | scores arrive | 0.0007 | 9720 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/players/4024123/games` | rendered | scores arrive | 0.0007 | 9783 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/players/3067313` | cached | scores arrive | 0.0007 | 9786 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/players/3067313` | rendered | scores arrive | 0.0007 | 9728 | span[dateline] "9 games · 1 live · 1 final · Pic" |
| `/no-such-page` | rendered | load | 0.0007 | 2576 | text |
| `/no-such-page` | rendered | load | 0.0031 | 6403 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/no-such-page` | rendered | scores arrive | 0.0007 | 10191 | span[dateline] "9 games · 1 live · 1 final · Pic" |

### Paint and hydration

| Route | Page | First paint ms | Largest paint ms | Site's own hydration mark ms | Every control hydrated ms | The largest element |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | rendered | 2512 | 2512 | 7382 | 7416 | h1[wordmark] "Yogan Hockey" |
| `/nhl` | cached | 2480 | 2480 | 5701 | 5757 | p[wordmark] "Yogan Hockey" |
| `/nhl` | rendered | 2496 | 2496 | 5710 | 5766 | p[wordmark] "Yogan Hockey" |
| `/nhl?tab=teams` | cached | 2448 | 2448 | 5723 | 5752 | p[wordmark] "Yogan Hockey" |
| `/nhl?tab=teams` | rendered | 2444 | 2444 | 5695 | 5720 | p[wordmark] "Yogan Hockey" |
| `/nhl/live` | rendered | 2488 | 2488 | 6852 | 7646 | p[wordmark] "Yogan Hockey" |
| `/nhl/teams/21` | cached | 2468 | 2468 | 6518 | 6705 | p[wordmark] "Yogan Hockey" |
| `/nhl/teams/21` | rendered | 2480 | 2480 | 6511 | 6645 | p[wordmark] "Yogan Hockey" |
| `/nhl/teams/21/roster` | cached | 2492 | 2492 | 6614 | 6713 | p[wordmark] "Yogan Hockey" |
| `/nhl/teams/21/roster` | rendered | 2488 | 2488 | 6616 | 6711 | p[wordmark] "Yogan Hockey" |
| `/nhl/teams/21/stats` | cached | 2484 | 2484 | 6618 | 6679 | p[wordmark] "Yogan Hockey" |
| `/nhl/teams/21/stats` | rendered | 2484 | 2484 | 6619 | 6643 | p[wordmark] "Yogan Hockey" |
| `/nhl/games/401803652` | cached | 2476 | 2476 | 5649 | 6403 | p[wordmark] "Yogan Hockey" |
| `/nhl/games/401803652` | rendered | 2472 | 2472 | 5645 | 6407 | p[wordmark] "Yogan Hockey" |
| `/nhl/games/401803652/scoring` | cached | 2452 | 2452 | 5622 | 6335 | p[wordmark] "Yogan Hockey" |
| `/nhl/games/401803652/scoring` | rendered | 2448 | 2448 | 5626 | 6363 | p[wordmark] "Yogan Hockey" |
| `/nhl/games/401803652/pick` | cached | 2460 | 2460 | 6077 | 6851 | p[wordmark] "Yogan Hockey" |
| `/nhl/games/401803652/pick` | rendered | 2464 | 2464 | 6084 | 6802 | p[wordmark] "Yogan Hockey" |
| `/nhl/games/401892449` | rendered | 2492 | 2492 | 6068 | 6810 | p[wordmark] "Yogan Hockey" |
| `/players` | cached | 2404 | 2404 | 6456 | 6486 | p[wordmark] "Yogan Hockey" |
| `/players` | rendered | 2396 | 2396 | 6460 | 6490 | p[wordmark] "Yogan Hockey" |
| `/players?q=mar` | rendered | 2448 | 2448 | 6449 | 6485 | p[wordmark] "Yogan Hockey" |
| `/players/4024123` | cached | 2472 | 2472 | 5935 | 5977 | p[wordmark] "Yogan Hockey" |
| `/players/4024123` | rendered | 2484 | 2484 | 5932 | 5973 | p[wordmark] "Yogan Hockey" |
| `/players/4024123/games` | cached | 2508 | 2508 | 5945 | 5963 | p[wordmark] "Yogan Hockey" |
| `/players/4024123/games` | rendered | 2508 | 2508 | 5936 | 5976 | p[wordmark] "Yogan Hockey" |
| `/players/3067313` | cached | 2524 | 2524 | 5949 | 5992 | p[wordmark] "Yogan Hockey" |
| `/players/3067313` | rendered | 2492 | 2492 | 5944 | 5981 | p[wordmark] "Yogan Hockey" |
| `/no-such-page` | rendered | 1636 | 1636 | 6252 | 6402 | p[wordmark] "Yogan Hockey" |

