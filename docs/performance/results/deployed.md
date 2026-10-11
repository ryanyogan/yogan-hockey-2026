<!-- Written by scripts/measure-performance.ts. Do not edit: measure again. -->

Measured 2026-10-11T20:24:23.581Z against `https://hockey.yogan.dev`, 3 runs a route, on Intel(R) Core(TM) i7-7700 CPU @ 3.60GHz x 8, linux.

## Every route against every budget

| Route | Page | First paint ms | Largest paint ms (budget) | Shift on load | Shift as scores arrive | Slowest tap ms | Next shell ms | Blank frames | View transition | Script gzip kB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | rendered (none) | 1672 | 1712 (2500) | **0.0209** ✗ | **0.0030** ✗ | 72 (theme toggle) | **759** ✗ | 0 | no | **261.9** ✗ |
| `/nhl` | cached (hit) | 1716 | **1720** ✗ (1500) | 0.0000 | **0.0030** ✗ | 80 (theme toggle) | **1582** ✗ | 0 | no | **254.6** ✗ |
| `/nhl` | rendered (bypass) | 1628 | 1628 (2500) | 0.0000 | **0.0030** ✗ | 120 (theme toggle) | **1543** ✗ | 0 | no | **254.6** ✗ |
| `/nhl?tab=teams` | cached (hit) | 1644 | **1644** ✗ (1500) | 0.0000 | **0.0030** ✗ | 64 (open the menu) | **1594** ✗ | 0 | no | **254.6** ✗ |
| `/nhl?tab=teams` | rendered (bypass) | 1668 | 1668 (2500) | 0.0000 | **0.0030** ✗ | 88 (open the menu) | **1581** ✗ | 0 | no | **254.6** ✗ |
| `/nhl/live` | rendered (none) | 1740 | 1740 (2500) | 0.0000 | **0.0490** ✗ | 96 (open the menu) | **748** ✗ | 0 | no | **257.4** ✗ |
| `/nhl/teams/21` | cached (stale, hit) | 1744 | **1744** ✗ (1500) | **0.0048** ✗ | **0.0030** ✗ | 104 (theme toggle) | **758** ✗ | 0 | no | **259.2** ✗ |
| `/nhl/teams/21` | rendered (bypass) | 1688 | 1688 (2500) | **0.0048** ✗ | **0.0030** ✗ | **200** ✗ (theme toggle) | **803** ✗ | 0 | no | **259.2** ✗ |
| `/nhl/teams/21/roster` | cached (hit) | 1708 | **1708** ✗ (1500) | 0.0000 | **0.0030** ✗ | 72 (theme toggle) | **716** ✗ | 0 | no | **259.2** ✗ |
| `/nhl/teams/21/roster` | rendered (bypass) | 1680 | 1680 (2500) | 0.0000 | **0.0030** ✗ | 88 (theme toggle) | **741** ✗ | 0 | no | **259.2** ✗ |
| `/nhl/teams/21/stats` | cached (hit) | 1632 | **1632** ✗ (1500) | 0.0000 | **0.0030** ✗ | 72 (open the menu) | **760** ✗ | 0 | no | **259.2** ✗ |
| `/nhl/teams/21/stats` | rendered (bypass) | 1652 | 1652 (2500) | 0.0000 | **0.0030** ✗ | 64 (open the menu) | **765** ✗ | 0 | no | **259.2** ✗ |
| `/nhl/games/401803652` | cached (stale, hit) | 1724 | **1724** ✗ (1500) | 0.0000 | **0.0030** ✗ | 80 (theme toggle) | **744** ✗ | 0 | no | **262.7** ✗ |
| `/nhl/games/401803652` | rendered (bypass) | 1720 | 1720 (2500) | 0.0000 | **0.0030** ✗ | 80 (theme toggle) | **740** ✗ | 0 | no | **262.7** ✗ |
| `/nhl/games/401803652/scoring` | cached (stale, hit) | 1744 | **2008** ✗ (1500) | 0.0000 | **0.0030** ✗ | 72 (theme toggle) | **757** ✗ | 0 | no | **262.7** ✗ |
| `/nhl/games/401803652/scoring` | rendered (bypass) | 1712 | 1980 (2500) | 0.0000 | **0.0030** ✗ | 64 (theme toggle) | **751** ✗ | 0 | no | **262.7** ✗ |
| `/nhl/games/401803652/pick` | cached (stale, hit) | 1740 | **1740** ✗ (1500) | 0.0000 | **0.0030** ✗ | 80 (theme toggle) | **734** ✗ | 0 | no | **262.7** ✗ |
| `/nhl/games/401803652/pick` | rendered (bypass) | 1732 | 1732 (2500) | 0.0000 | **0.0030** ✗ | 88 (theme toggle) | **737** ✗ | 0 | no | **262.7** ✗ |
| `/nhl/games/401892482` | rendered (miss) | 1720 | 1992 (2500) | **0.0015** ✗ | **0.0030** ✗ | 64 (theme toggle) | **1509** ✗ | 0 | no | **262.7** ✗ |
| `/players` | cached (hit, miss) | 1688 | **1688** ✗ (1500) | 0.0000 | **0.0030** ✗ | 64 (open the menu) | **692** ✗ | 0 | no | **261.5** ✗ |
| `/players` | rendered (bypass) | 1740 | 1740 (2500) | 0.0000 | **0.0030** ✗ | 64 (open the menu) | **701** ✗ | 0 | no | **261.6** ✗ |
| `/players?q=mar` | rendered (bypass) | 1688 | 1712 (2500) | 0.0000 | **0.0030** ✗ | 72 (open the menu) | **758** ✗ | 0 | no | **261.6** ✗ |
| `/players/4024123` | cached (hit) | 1720 | **1720** ✗ (1500) | 0.0000 | **0.0030** ✗ | 72 (theme toggle) | **1545** ✗ | 0 | no | **255.3** ✗ |
| `/players/4024123` | rendered (bypass) | 1768 | 1768 (2500) | 0.0000 | **0.0030** ✗ | 96 (open the menu) | **1569** ✗ | 0 | no | **255.3** ✗ |
| `/players/4024123/games` | cached (hit) | 1756 | **1756** ✗ (1500) | 0.0000 | **0.0030** ✗ | 72 (open the menu) | **789** ✗ | 0 | no | **255.3** ✗ |
| `/players/4024123/games` | rendered (bypass) | 1728 | 1760 (2500) | 0.0000 | **0.0030** ✗ | 72 (theme toggle) | **788** ✗ | 0 | no | **255.3** ✗ |
| `/players/3067313` | cached (hit) | 1796 | **1796** ✗ (1500) | 0.0000 | **0.0030** ✗ | 88 (theme toggle) | **1624** ✗ | 0 | no | **255.3** ✗ |
| `/players/3067313` | rendered (bypass) | 1788 | 1788 (2500) | 0.0000 | **0.0030** ✗ | 88 (open the menu) | **1743** ✗ | 0 | no | **255.3** ✗ |

## What each route sends

| Route | Script files | Script kB | Script gzip kB | **Script budget, gzip kB** | Document kB | Document gzip kB | Stylesheet gzip kB |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 42 | 830.5 | **261.9** ✗ | **252** | 116.7 | 13.5 | 16.8 |
| `/nhl` | 32 | 815.2 | **254.6** ✗ | **244** | 185.0 | 15.1 | 16.8 |
| `/nhl?tab=teams` | 32 | 815.2 | **254.6** ✗ | **244** | 104.5 | 12.5 | 16.8 |
| `/nhl/live` | 36 | 821.8 | **257.4** ✗ | **247** | 122.4 | 12.1 | 16.8 |
| `/nhl/teams/21` | 39 | 825.3 | **259.2** ✗ | **249** | 402.5 | 25.4 | 16.8 |
| `/nhl/teams/21/roster` | 39 | 825.3 | **259.2** ✗ | **249** | 166.6 | 14.9 | 16.8 |
| `/nhl/teams/21/stats` | 39 | 825.3 | **259.2** ✗ | **249** | 89.1 | 11.5 | 16.8 |
| `/nhl/games/401803652` | 35 | 838.8 | **262.7** ✗ | **253** | 308.4 | 28.6 | 16.8 |
| `/nhl/games/401803652/scoring` | 35 | 838.8 | **262.7** ✗ | **253** | 282.5 | 27.7 | 16.8 |
| `/nhl/games/401803652/pick` | 35 | 838.8 | **262.7** ✗ | **253** | 308.5 | 28.6 | 16.8 |
| `/nhl/games/401892482` | 35 | 838.8 | **262.7** ✗ | **253** | 123.5 | 15.0 | 16.8 |
| `/players` | 39 | 830.2 | **261.6** ✗ | **251** | 37.4 | 6.9 | 17.4 |
| `/players?q=mar` | 39 | 830.2 | **261.6** ✗ | **251** | 60.7 | 9.8 | 17.4 |
| `/players/4024123` | 33 | 816.4 | **255.3** ✗ | **245** | 174.0 | 15.4 | 17.4 |
| `/players/4024123/games` | 33 | 816.4 | **255.3** ✗ | **245** | 174.3 | 15.5 | 17.4 |
| `/players/3067313` | 33 | 816.4 | **255.3** ✗ | **245** | 149.5 | 14.7 | 17.4 |

## Detail

### Every tap

| Route | Page | Tap | ms to next paint |
| --- | --- | --- | --- |
| `/` | rendered | theme toggle | 72 |
| `/` | rendered | open the whole slate | n/a |
| `/` | rendered | open the menu | 64 |
| `/nhl` | cached | theme toggle | 80 |
| `/nhl` | cached | open the whole slate | n/a |
| `/nhl` | cached | open the menu | 72 |
| `/nhl` | rendered | theme toggle | 120 |
| `/nhl` | rendered | open the whole slate | n/a |
| `/nhl` | rendered | open the menu | 80 |
| `/nhl?tab=teams` | cached | theme toggle | 48 |
| `/nhl?tab=teams` | cached | open the whole slate | n/a |
| `/nhl?tab=teams` | cached | open the menu | 64 |
| `/nhl?tab=teams` | rendered | theme toggle | 64 |
| `/nhl?tab=teams` | rendered | open the whole slate | n/a |
| `/nhl?tab=teams` | rendered | open the menu | 88 |
| `/nhl/live` | rendered | theme toggle | 72 |
| `/nhl/live` | rendered | open the whole slate | n/a |
| `/nhl/live` | rendered | open the menu | 96 |
| `/nhl/teams/21` | cached | theme toggle | 104 |
| `/nhl/teams/21` | cached | open the whole slate | n/a |
| `/nhl/teams/21` | cached | favorite heart | 32 |
| `/nhl/teams/21` | cached | open the menu | 72 |
| `/nhl/teams/21` | rendered | theme toggle | **200** ✗ |
| `/nhl/teams/21` | rendered | open the whole slate | n/a |
| `/nhl/teams/21` | rendered | favorite heart | 40 |
| `/nhl/teams/21` | rendered | open the menu | 64 |
| `/nhl/teams/21/roster` | cached | theme toggle | 72 |
| `/nhl/teams/21/roster` | cached | open the whole slate | n/a |
| `/nhl/teams/21/roster` | cached | favorite heart | 32 |
| `/nhl/teams/21/roster` | cached | open the menu | 72 |
| `/nhl/teams/21/roster` | rendered | theme toggle | 88 |
| `/nhl/teams/21/roster` | rendered | open the whole slate | n/a |
| `/nhl/teams/21/roster` | rendered | favorite heart | 32 |
| `/nhl/teams/21/roster` | rendered | open the menu | 88 |
| `/nhl/teams/21/stats` | cached | theme toggle | 56 |
| `/nhl/teams/21/stats` | cached | open the whole slate | n/a |
| `/nhl/teams/21/stats` | cached | favorite heart | 32 |
| `/nhl/teams/21/stats` | cached | open the menu | 72 |
| `/nhl/teams/21/stats` | rendered | theme toggle | 56 |
| `/nhl/teams/21/stats` | rendered | open the whole slate | n/a |
| `/nhl/teams/21/stats` | rendered | favorite heart | 32 |
| `/nhl/teams/21/stats` | rendered | open the menu | 64 |
| `/nhl/games/401803652` | cached | theme toggle | 80 |
| `/nhl/games/401803652` | cached | open the whole slate | n/a |
| `/nhl/games/401803652` | cached | select a goal on the timeline | 56 |
| `/nhl/games/401803652` | cached | open the menu | 64 |
| `/nhl/games/401803652` | rendered | theme toggle | 80 |
| `/nhl/games/401803652` | rendered | open the whole slate | n/a |
| `/nhl/games/401803652` | rendered | select a goal on the timeline | 56 |
| `/nhl/games/401803652` | rendered | open the menu | 64 |
| `/nhl/games/401803652/scoring` | cached | theme toggle | 72 |
| `/nhl/games/401803652/scoring` | cached | open the whole slate | n/a |
| `/nhl/games/401803652/scoring` | cached | select a goal on the timeline | 56 |
| `/nhl/games/401803652/scoring` | cached | open the menu | 72 |
| `/nhl/games/401803652/scoring` | rendered | theme toggle | 64 |
| `/nhl/games/401803652/scoring` | rendered | open the whole slate | n/a |
| `/nhl/games/401803652/scoring` | rendered | select a goal on the timeline | 56 |
| `/nhl/games/401803652/scoring` | rendered | open the menu | 56 |
| `/nhl/games/401803652/pick` | cached | theme toggle | 80 |
| `/nhl/games/401803652/pick` | cached | open the whole slate | n/a |
| `/nhl/games/401803652/pick` | cached | select a goal on the timeline | 56 |
| `/nhl/games/401803652/pick` | cached | open the menu | 72 |
| `/nhl/games/401803652/pick` | rendered | theme toggle | 88 |
| `/nhl/games/401803652/pick` | rendered | open the whole slate | n/a |
| `/nhl/games/401803652/pick` | rendered | select a goal on the timeline | 72 |
| `/nhl/games/401803652/pick` | rendered | open the menu | 64 |
| `/nhl/games/401892482` | rendered | theme toggle | 64 |
| `/nhl/games/401892482` | rendered | open the whole slate | n/a |
| `/nhl/games/401892482` | rendered | open the menu | 64 |
| `/players` | cached | theme toggle | 48 |
| `/players` | cached | open the whole slate | n/a |
| `/players` | cached | type in the search | 16 |
| `/players` | cached | open the menu | 64 |
| `/players` | rendered | theme toggle | 40 |
| `/players` | rendered | open the whole slate | n/a |
| `/players` | rendered | type in the search | 24 |
| `/players` | rendered | open the menu | 64 |
| `/players?q=mar` | rendered | theme toggle | 64 |
| `/players?q=mar` | rendered | open the whole slate | n/a |
| `/players?q=mar` | rendered | favorite heart | 32 |
| `/players?q=mar` | rendered | open the menu | 72 |
| `/players/4024123` | cached | theme toggle | 72 |
| `/players/4024123` | cached | open the whole slate | n/a |
| `/players/4024123` | cached | favorite heart | 32 |
| `/players/4024123` | cached | open the menu | 64 |
| `/players/4024123` | rendered | theme toggle | 72 |
| `/players/4024123` | rendered | open the whole slate | n/a |
| `/players/4024123` | rendered | favorite heart | 32 |
| `/players/4024123` | rendered | open the menu | 96 |
| `/players/4024123/games` | cached | theme toggle | 64 |
| `/players/4024123/games` | cached | open the whole slate | n/a |
| `/players/4024123/games` | cached | favorite heart | 32 |
| `/players/4024123/games` | cached | open the menu | 72 |
| `/players/4024123/games` | rendered | theme toggle | 72 |
| `/players/4024123/games` | rendered | open the whole slate | n/a |
| `/players/4024123/games` | rendered | favorite heart | 32 |
| `/players/4024123/games` | rendered | open the menu | 72 |
| `/players/3067313` | cached | theme toggle | 88 |
| `/players/3067313` | cached | open the whole slate | n/a |
| `/players/3067313` | cached | favorite heart | 32 |
| `/players/3067313` | cached | open the menu | 80 |
| `/players/3067313` | rendered | theme toggle | 80 |
| `/players/3067313` | rendered | open the whole slate | n/a |
| `/players/3067313` | rendered | favorite heart | 32 |
| `/players/3067313` | rendered | open the menu | 88 |

### Every navigation

| From | Page | To | Shell ms | Content ms | Blank frames | Requests after the tap | Whole document loaded |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | rendered | `/nhl/games/401892482` | 759 | 1330 | 0 | 1 | no |
| `/nhl` | cached | `/nhl/teams/20` | 1582 | 1742 | 0 | 1 | no |
| `/nhl` | rendered | `/nhl/teams/20` | 1543 | 1704 | 0 | 1 | no |
| `/nhl?tab=teams` | cached | `/nhl/teams/25` | 1594 | 1747 | 0 | 1 | no |
| `/nhl?tab=teams` | rendered | `/nhl/teams/25` | 1581 | 1724 | 0 | 1 | no |
| `/nhl/live` | rendered | `/nhl/games/401892482` | 748 | 1334 | 0 | 1 | no |
| `/nhl/teams/21` | cached | `/nhl/teams/21/roster` | 758 | 758 | 0 | 1 | no |
| `/nhl/teams/21` | rendered | `/nhl/teams/21/roster` | 803 | 803 | 0 | 1 | no |
| `/nhl/teams/21/roster` | cached | `/players/4781550` | 716 | 716 | 0 | 1 | no |
| `/nhl/teams/21/roster` | rendered | `/players/4781550` | 741 | 741 | 0 | 1 | no |
| `/nhl/teams/21/stats` | cached | `/nhl/teams/21` | 760 | 1194 | 0 | 1 | no |
| `/nhl/teams/21/stats` | rendered | `/nhl/teams/21` | 765 | 1198 | 0 | 1 | no |
| `/nhl/games/401803652` | cached | `/nhl/games/401803652/scoring` | 744 | 744 | 0 | 1 | no |
| `/nhl/games/401803652` | rendered | `/nhl/games/401803652/scoring` | 740 | 740 | 0 | 1 | no |
| `/nhl/games/401803652/scoring` | cached | `/nhl/games/401803652` | 757 | 757 | 0 | 1 | no |
| `/nhl/games/401803652/scoring` | rendered | `/nhl/games/401803652` | 751 | 751 | 0 | 1 | no |
| `/nhl/games/401803652/pick` | cached | `/nhl/games/401803652` | 734 | 734 | 0 | 1 | no |
| `/nhl/games/401803652/pick` | rendered | `/nhl/games/401803652` | 737 | 737 | 0 | 1 | no |
| `/nhl/games/401892482` | rendered | `/nhl/teams/124292` | 1509 | 1697 | 0 | 1 | no |
| `/players` | cached | `/nhl?tab=teams` | 692 | 692 | 0 | 1 | no |
| `/players` | rendered | `/nhl?tab=teams` | 701 | 701 | 0 | 1 | no |
| `/players?q=mar` | rendered | `/players/3852` | 758 | 758 | 0 | 1 | no |
| `/players/4024123` | cached | `/nhl/teams/21` | 1545 | 1715 | 0 | 1 | no |
| `/players/4024123` | rendered | `/nhl/teams/21` | 1569 | 1731 | 0 | 1 | no |
| `/players/4024123/games` | cached | `/nhl/games/401892478` | 789 | 1451 | 0 | 1 | no |
| `/players/4024123/games` | rendered | `/nhl/games/401892478` | 788 | 1483 | 0 | 1 | no |
| `/players/3067313` | cached | `/nhl/teams/21` | 1624 | 1778 | 0 | 1 | no |
| `/players/3067313` | rendered | `/nhl/teams/21` | 1743 | 1888 | 0 | 1 | no |

### Every layout shift

| Route | Page | When | Score | At ms | What moved |
| --- | --- | --- | --- | --- | --- |
| `/` | rendered | load | 0.0209 | 5221 | div "Standings eastern conferencefull"; div[ledger] "#teamwlotlpts1VGK510102EDM40193A" |
| `/` | rendered | scores arrive | 0.0030 | 8293 | li[score-ticker] "CAR@atPHI6:00 PM" |
| `/nhl` | cached | scores arrive | 0.0030 | 7670 | li[score-ticker] "CAR@atPHI6:00 PM" |
| `/nhl` | rendered | scores arrive | 0.0030 | 7553 | li[score-ticker] "CAR@atPHI6:00 PM" |
| `/nhl?tab=teams` | cached | scores arrive | 0.0030 | 7523 | li[score-ticker] "CAR@atPHI6:00 PM" |
| `/nhl?tab=teams` | rendered | scores arrive | 0.0030 | 7510 | li[score-ticker] "CAR@atPHI6:00 PM" |
| `/nhl/live` | rendered | scores arrive | 0.0490 | 7447 | section[section] "Upcoming 1statusawayhomenoteCAR "; tr[ledger-row] "CAR at PHI, 6:00 PMCAR 78%CAR 4-"; li[score-ticker] "CAR@atPHI6:00 PM" |
| `/nhl/teams/21` | cached | load | 0.0048 | 4392 | td[ledger-cell] "6:00 PM"; td[ledger-cell] "8:00 PM"; td[ledger-cell] "6:30 PM" |
| `/nhl/teams/21` | cached | scores arrive | 0.0030 | 7693 | li[score-ticker] "CAR@atPHI6:00 PM" |
| `/nhl/teams/21` | rendered | load | 0.0048 | 4663 | td[ledger-cell] "6:00 PM"; td[ledger-cell] "8:00 PM"; td[ledger-cell] "6:30 PM" |
| `/nhl/teams/21` | rendered | scores arrive | 0.0030 | 7798 | li[score-ticker] "CAR@atPHI6:00 PM" |
| `/nhl/teams/21/roster` | cached | scores arrive | 0.0030 | 7402 | li[score-ticker] "CAR@atPHI6:00 PM" |
| `/nhl/teams/21/roster` | rendered | scores arrive | 0.0030 | 7212 | li[score-ticker] "CAR@atPHI6:00 PM" |
| `/nhl/teams/21/stats` | cached | scores arrive | 0.0030 | 7462 | li[score-ticker] "CAR@atPHI6:00 PM" |
| `/nhl/teams/21/stats` | rendered | scores arrive | 0.0030 | 7228 | li[score-ticker] "CAR@atPHI6:00 PM" |
| `/nhl/games/401803652` | cached | scores arrive | 0.0030 | 7257 | li[score-ticker] "CAR@atPHI6:00 PM" |
| `/nhl/games/401803652` | rendered | scores arrive | 0.0030 | 7457 | li[score-ticker] "CAR@atPHI6:00 PM" |
| `/nhl/games/401803652/scoring` | cached | scores arrive | 0.0030 | 7308 | li[score-ticker] "CAR@atPHI6:00 PM" |
| `/nhl/games/401803652/scoring` | rendered | scores arrive | 0.0030 | 7282 | li[score-ticker] "CAR@atPHI6:00 PM" |
| `/nhl/games/401803652/pick` | cached | scores arrive | 0.0030 | 7229 | li[score-ticker] "CAR@atPHI6:00 PM" |
| `/nhl/games/401803652/pick` | rendered | scores arrive | 0.0030 | 7208 | li[score-ticker] "CAR@atPHI6:00 PM" |
| `/nhl/games/401892482` | rendered | load | 0.0015 | 3592 | text |
| `/nhl/games/401892482` | rendered | scores arrive | 0.0030 | 7282 | li[score-ticker] "CAR@atPHI6:00 PM" |
| `/players` | cached | scores arrive | 0.0030 | 7633 | li[score-ticker] "CAR@atPHI6:00 PM" |
| `/players` | rendered | scores arrive | 0.0030 | 7690 | li[score-ticker] "CAR@atPHI6:00 PM" |
| `/players?q=mar` | rendered | scores arrive | 0.0030 | 7807 | li[score-ticker] "CAR@atPHI6:00 PM" |
| `/players/4024123` | cached | scores arrive | 0.0030 | 7467 | li[score-ticker] "CAR@atPHI6:00 PM" |
| `/players/4024123` | rendered | scores arrive | 0.0030 | 7190 | li[score-ticker] "CAR@atPHI6:00 PM" |
| `/players/4024123/games` | cached | scores arrive | 0.0030 | 7361 | li[score-ticker] "CAR@atPHI6:00 PM" |
| `/players/4024123/games` | rendered | scores arrive | 0.0030 | 7202 | li[score-ticker] "CAR@atPHI6:00 PM" |
| `/players/3067313` | cached | scores arrive | 0.0030 | 8033 | li[score-ticker] "CAR@atPHI6:00 PM" |
| `/players/3067313` | rendered | scores arrive | 0.0030 | 7202 | li[score-ticker] "CAR@atPHI6:00 PM" |

### Paint and hydration

| Route | Page | First paint ms | Largest paint ms | Taps work from ms | The largest element |
| --- | --- | --- | --- | --- | --- |
| `/` | rendered | 1672 | 1712 | 3911 | h2[section-header] "Standings eastern conference" |
| `/nhl` | cached | 1716 | 1720 | 3781 | h2[section-header] "Metropolitan Division East" |
| `/nhl` | rendered | 1628 | 1628 | 3725 | h2[section-header] "Metropolitan Division East" |
| `/nhl?tab=teams` | cached | 1644 | 1644 | 3684 | td[ledger-cell] "Columbus Blue Jackets" |
| `/nhl?tab=teams` | rendered | 1668 | 1668 | 3641 | td[ledger-cell] "Columbus Blue Jackets" |
| `/nhl/live` | rendered | 1740 | 1740 | 3492 | footer "Scores and stats from ESPN. Yoga" |
| `/nhl/teams/21` | cached | 1744 | 1744 | 3800 | h2[section-header] "Toronto Maple Leafs Toronto · Ea" |
| `/nhl/teams/21` | rendered | 1688 | 1688 | 3755 | h2[section-header] "Toronto Maple Leafs Toronto · Ea" |
| `/nhl/teams/21/roster` | cached | 1708 | 1708 | 3472 | h2[section-header] "Toronto Maple Leafs Toronto · Ea" |
| `/nhl/teams/21/roster` | rendered | 1680 | 1680 | 3444 | h2[section-header] "Toronto Maple Leafs Toronto · Ea" |
| `/nhl/teams/21/stats` | cached | 1632 | 1632 | 3483 | h2[section-header] "Toronto Maple Leafs Toronto · Ea" |
| `/nhl/teams/21/stats` | rendered | 1652 | 1652 | 3400 | h2[section-header] "Toronto Maple Leafs Toronto · Ea" |
| `/nhl/games/401803652` | cached | 1724 | 1724 | 3628 | footer "Scores and stats from ESPN. Yoga" |
| `/nhl/games/401803652` | rendered | 1720 | 1720 | 3602 | footer "Scores and stats from ESPN. Yoga" |
| `/nhl/games/401803652/scoring` | cached | 1744 | 2008 | 3532 | span[play-row] "Mavrik Bourque Goal (20) Snap Sh" |
| `/nhl/games/401803652/scoring` | rendered | 1712 | 1980 | 3441 | span[play-row] "Mavrik Bourque Goal (20) Snap Sh" |
| `/nhl/games/401803652/pick` | cached | 1740 | 1740 | 3410 | footer "Scores and stats from ESPN. Yoga" |
| `/nhl/games/401803652/pick` | rendered | 1732 | 1732 | 3409 | footer "Scores and stats from ESPN. Yoga" |
| `/nhl/games/401892482` | rendered | 1720 | 1992 | 3459 | p[game-pick-full] "Washington Capitals 63%. The Cap" |
| `/players` | cached | 1688 | 1688 | 3410 | footer "Scores and stats from ESPN. Yoga" |
| `/players` | rendered | 1740 | 1740 | 3465 | footer "Scores and stats from ESPN. Yoga" |
| `/players?q=mar` | rendered | 1688 | 1712 | 3736 | footer "Scores and stats from ESPN. Yoga" |
| `/players/4024123` | cached | 1720 | 1720 | 3496 | div[section-header] "695 GP · 432 G · 358 A · 790 PTS" |
| `/players/4024123` | rendered | 1768 | 1768 | 3455 | div[section-header] "695 GP · 432 G · 358 A · 790 PTS" |
| `/players/4024123/games` | cached | 1756 | 1756 | 3363 | div[section-header] "695 GP · 432 G · 358 A · 790 PTS" |
| `/players/4024123/games` | rendered | 1728 | 1760 | 3371 | div[section-header] "695 GP · 432 G · 358 A · 790 PTS" |
| `/players/3067313` | cached | 1796 | 1796 | 3453 | span[player-header] "Goaltender · #41 · Toronto Maple" |
| `/players/3067313` | rendered | 1788 | 1788 | 3438 | span[player-header] "Goaltender · #41 · Toronto Maple" |

