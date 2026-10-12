<!-- Written by scripts/measure-performance.ts. Do not edit: measure again. -->

Measured 2026-10-12T16:25:38.910Z against `http://localhost:5187`, 3 runs a route, on AMD Ryzen AI 9 HX 370 w/ Radeon 890M x 24, linux.

## Every route against every budget

| Route | Page | First paint ms | Largest paint ms (budget) | Shift on load | Shift as scores arrive | Slowest tap ms | Next shell ms | Blank frames | View transition | Script gzip kB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/nhl` | rendered (none) | 1640 | 1640 (2500) | **0.0031** ✗ | 0.0005 | 80 (open the whole slate) | 23 | 0 | yes | 186.2 |
| `/nhl?tab=teams` | rendered (none) | 1548 | 1548 (2500) | **0.0031** ✗ | 0.0005 | 56 (open the whole slate) | 12 | 0 | yes | 186.2 |

## What each route sends

| Route | Script files | Script kB | Script gzip kB | **Script budget, gzip kB** | Document kB | Document gzip kB | Stylesheet gzip kB |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/nhl` | 2 | 625.3 | 186.2 | **244** | 107.3 | 10.3 | 11.2 |
| `/nhl?tab=teams` | 2 | 625.3 | 186.2 | **244** | 59.8 | 8.3 | 11.2 |

## Detail

### Every tap

| Route | Page | Tap | ms to next paint |
| --- | --- | --- | --- |
| `/nhl` | rendered | theme toggle | n/a |
| `/nhl` | rendered | open the whole slate | 80 |
| `/nhl?tab=teams` | rendered | theme toggle | n/a |
| `/nhl?tab=teams` | rendered | open the whole slate | 56 |

### Every navigation

| From | Page | To | Shell ms | Content ms | Blank frames | Requests after the tap | Whole document loaded |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/nhl` | rendered | `/nhl/teams/14` | 23 | 23 | 0 | 0 | no |
| `/nhl?tab=teams` | rendered | `/nhl/teams/25` | 12 | 12 | 0 | 0 | no |

### Every layout shift

| Route | Page | When | Score | At ms | What moved |
| --- | --- | --- | --- | --- | --- |
| `/nhl` | rendered | load | 0.0031 | 5625 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/nhl` | rendered | scores arrive | 0.0005 | 9511 | span[dateline] "9 games · 1 live · 1 final" |
| `/nhl?tab=teams` | rendered | load | 0.0031 | 4350 | li[score-ticker] "favorite team, NSH@atTOR6:00 PM" |
| `/nhl?tab=teams` | rendered | scores arrive | 0.0005 | 8390 | span[dateline] "9 games · 1 live · 1 final" |

### Paint and hydration

| Route | Page | First paint ms | Largest paint ms | Taps work from ms | The largest element |
| --- | --- | --- | --- | --- | --- |
| `/nhl` | rendered | 1640 | 1640 | 4031 | p[wordmark] "Yogan Hockey" |
| `/nhl?tab=teams` | rendered | 1548 | 1548 | 4080 | p[wordmark] "Yogan Hockey" |

