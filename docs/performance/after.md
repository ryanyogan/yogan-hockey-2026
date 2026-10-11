# Performance after #127

The routes of the baseline (`baseline.md`, #126) measured again with the same commands, on the same machine and profile, after the work of #127. Every number below is beside the baseline's: `before → after`. A miss that stands is bold with a cross.

Measured 2026-10-11, 21:55 to 22:37 UTC, at commit `357d045` (this branch with `main` up to #142 merged: the look of #138, the rink's animations, penalties and the goal sequence). Three runs a route, favorites in localStorage, as the baseline.

```sh
export TMPDIR="$PWD/node_modules/.tmp" && mkdir -p "$TMPDIR"
PORT=<your port> scripts/performance-baseline.sh local --out=docs/performance/results/after-local
```

Full tables, with every tap, navigation and shift: `results/after-local.md` and `.json`. The baseline's are `results/local.*`, untouched.

Other agents were building and testing on the machine during this run, as during the baseline's: a difference under about 10% is noise. Nothing below depends on one.

## Every route, every budget

Budgets: largest paint under 1500 ms cached and 2500 ms rendered; a shift that prints as 0.000; a tap under 200 ms; the next page's shell under 200 ms from the tap with no blank frame and inside a view transition; script no more than the route's budget (next section). "Next content" and "Hydrated" have no budget and are here because the work moved them.

| Route | Page | Largest paint ms (budget) | Shift on load | Shift as scores arrive | Slowest tap ms | Next shell ms | Blank frames | View transition | Next content ms | Hydrated ms | Script gzip kB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | rendered | 8312 → 820 (2500) | 0.0038 → 0.0000 | 0.0000 → 0.0000 | 72 → 80 | 661 → 76 | 0 → 0 | no → yes | 661 → 724 | 6989 → 6747 | 251.3 → 194.6 |
| `/nhl` | cached | 1580 → 828 (1500) | 0.0000 → 0.0000 | 0.0000 → 0.0000 | 72 → 104 | 820 → 148 | 0 → 0 | no → yes | 820 → 998 | 6038 → 5177 | 244.0 → 187.8 |
| `/nhl` | rendered | 1580 → 832 (2500) | 0.0000 → 0.0000 | 0.0000 → 0.0000 | 72 → 104 | 815 → 117 | 0 → 0 | no → yes | 815 → 922 | 6040 → 5176 | 244.0 → 187.8 |
| `/nhl?tab=teams` | cached | 1572 → 820 (1500) | 0.0000 → 0.0000 | 0.0000 → 0.0000 | 72 → 96 | 829 → 126 | 0 → 0 | no → yes | 829 → 1040 | 6606 → 5514 | 244.0 → 187.8 |
| `/nhl?tab=teams` | rendered | 1584 → 812 (2500) | 0.0000 → 0.0000 | 0.0000 → 0.0000 | 64 → 112 | 810 → 179 | 0 → 0 | no → yes | 810 → 1029 | 6611 → 5518 | 244.0 → 187.8 |
| `/nhl/live` | rendered | 1532 → 828 (2500) | 0.0030 → 0.0000 | 0.1351 → **0.1506** ✗ | 64 → 72 | 693 → 83 | 0 → 0 | no → yes | 1277 → 733 | 6101 → 5938 | 246.8 → 189.9 |
| `/nhl/teams/21` | cached | 1628 → 868 (1500) | 0.0048 → 0.0000 | 0.0000 → 0.0000 | 104 → 112 | 717 → 105 | 0 → 0 | no → yes | 717 → 781 | 6420 → 5465 | 248.6 → 191.3 |
| `/nhl/teams/21` | rendered | 1620 → 856 (2500) | 0.0048 → 0.0000 | 0.0000 → 0.0000 | 104 → 104 | 711 → 109 | 0 → 0 | no → yes | 711 → 768 | 6415 → 5437 | 248.6 → 191.3 |
| `/nhl/teams/21/roster` | cached | 1572 → 804 (1500) | 0.0000 → 0.0000 | 0.0000 → 0.0000 | 64 → 88 | 828 → 75 | 0 → 0 | no → yes | 828 → 889 | 5201 → 4901 | 248.6 → 191.3 |
| `/nhl/teams/21/roster` | rendered | 1576 → 820 (2500) | 0.0000 → 0.0000 | 0.0000 → 0.0000 | 72 → 88 | 825 → 93 | 0 → 0 | no → yes | 825 → 888 | 5191 → 4908 | 248.6 → 191.3 |
| `/nhl/teams/21/stats` | cached | 1564 → 808 (1500) | 0.0000 → 0.0000 | 0.0000 → 0.0000 | 64 → 96 | 739 → 83 | 0 → 0 | no → yes | 1070 → 2188 | 5208 → 4888 | 248.6 → 191.3 |
| `/nhl/teams/21/stats` | rendered | 1584 → 792 (2500) | 0.0000 → 0.0000 | 0.0000 → 0.0000 | 64 → 88 | 748 → 89 | 0 → 0 | no → yes | 1121 → 1780 | 5200 → 4910 | 248.6 → 191.3 |
| `/nhl/games/401803652` | cached | 1512 → 852 (1500) | 0.0000 → 0.0000 | 0.0000 → 0.0000 | 80 → 88 | 737 → 71 | 0 → 0 | no → yes | 737 → 793 | 4301 → 4272 | 252.6 → 246.0 |
| `/nhl/games/401803652` | rendered | 1548 → 848 (2500) | 0.0000 → 0.0000 | 0.0000 → 0.0000 | 80 → 88 | 743 → 78 | 0 → 0 | no → yes | 743 → 780 | 4445 → 4265 | 252.6 → 246.0 |
| `/nhl/games/401803652/scoring` | cached | 1528 → 824 (1500) | 0.0000 → 0.0000 | 0.0000 → 0.0000 | 72 → 80 | 758 → 89 | 0 → 0 | no → yes | 758 → 774 | 4451 → 4273 | 252.6 → 246.0 |
| `/nhl/games/401803652/scoring` | rendered | 1528 → 900 (2500) | 0.0000 → 0.0000 | 0.0000 → 0.0000 | 80 → 144 | 756 → 106 | 0 → 0 | no → yes | 756 → 775 | 4444 → 4287 | 252.6 → 246.0 |
| `/nhl/games/401803652/pick` | cached | 1568 → 824 (1500) | 0.0087 → 0.0000 | 0.0000 → 0.0000 | 80 → 88 | 759 → 80 | 0 → 0 | no → yes | 759 → 772 | 4342 → 4267 | 252.6 → 246.0 |
| `/nhl/games/401803652/pick` | rendered | 1540 → 828 (2500) | 0.0012 → 0.0000 | 0.0000 → 0.0000 | 72 → 104 | 782 → 103 | 0 → 0 | no → yes | 782 → 755 | 4359 → 4264 | 252.6 → 246.0 |
| `/nhl/games/401892449` | rendered | 1524 → 812 (2500) | 0.0014 → 0.0000 | 0.0000 → 0.0000 | 88 → 72 | 842 → 111 | 0 → 0 | no → yes | 842 → 905 | 4322 → 4248 | 252.1 → 246.0 |
| `/players` | cached | 1572 → 776 (1500) | 0.0000 → 0.0000 | 0.0000 → 0.0000 | 72 → 88 | 701 → 82 | 0 → 0 | no → yes | 701 → 776 | 5089 → 4855 | 250.9 → 194.0 |
| `/players` | rendered | 1556 → 788 (2500) | 0.0000 → 0.0000 | 0.0000 → 0.0000 | 64 → 80 | 706 → 85 | 0 → 0 | no → yes | 706 → 776 | 5079 → 4864 | 250.9 → 194.0 |
| `/players?q=mar` | rendered | 1572 → 800 (2500) | 0.0000 → 0.0000 | 0.0000 → 0.0000 | 64 → 72 | 822 → 71 | 0 → 0 | no → yes | 822 → 891 | 5721 → 5494 | 250.9 → 194.0 |
| `/players/4024123` | cached | 1588 → 800 (1500) | 0.0000 → 0.0000 | 0.0000 → 0.0000 | 88 → 72 | 1614 → 105 | 0 → 0 | no → yes | 1614 → 1761 | 4675 → 4560 | 244.6 → 188.5 |
| `/players/4024123` | rendered | 1588 → 796 (2500) | 0.0000 → 0.0000 | 0.0000 → 0.0000 | 72 → 72 | 1637 → 112 | 0 → 0 | no → yes | 1637 → 1819 | 4666 → 4553 | 244.6 → 188.5 |
| `/players/4024123/games` | cached | 1584 → 808 (1500) | 0.0000 → 0.0000 | 0.0000 → 0.0000 | 72 → 120 | 666 → 73 | 0 → 0 | no → yes | 666 → 695 | 4684 → 4555 | 244.6 → 188.5 |
| `/players/4024123/games` | rendered | 1592 → 808 (2500) | 0.0000 → 0.0000 | 0.0000 → 0.0000 | 80 → 80 | 680 → 78 | 0 → 0 | no → yes | 680 → 707 | 4699 → 4561 | 244.6 → 188.5 |
| `/players/3067313` | cached | 1588 → 796 (1500) | 0.0000 → 0.0000 | 0.0000 → 0.0000 | 72 → 72 | 1647 → 110 | 0 → 0 | no → yes | 1750 → 1787 | 4679 → 4556 | 244.6 → 188.5 |
| `/players/3067313` | rendered | 1600 → 796 (2500) | 0.0000 → 0.0000 | 0.0000 → 0.0000 | 80 → 80 | 1604 → 106 | 0 → 0 | no → yes | 1604 → 1729 | 4676 → 4558 | 244.6 → 188.5 |

**In short**: one miss stands, and it is Ryan's to decide (`/nhl/live` as games change section, below). Everything else the baseline found is inside its budget on every route.

| Budget | Baseline | Now |
| --- | --- | --- |
| Largest paint, cached (1500 ms) | 1512 to 1628, a miss on every route | 776 to 868 |
| Largest paint, rendered (2500 ms) | 1524 to 1620, and 8312 on the dashboard | 788 to 900 |
| Shift on load (zero) | five routes, up to 0.0087 | 0.0000 on every route |
| Shift as scores arrive (zero) | 0.1351 on `/nhl/live` | **0.1506** ✗ on `/nhl/live`, 0.0000 elsewhere |
| Slowest tap (200 ms) | 64 to 104 | 72 to 144 |
| Next shell (200 ms) | 661 to 1647, a miss on every route | 71 to 179 |
| Blank frames | 0 | 0 |
| View transition | on no navigation | on every navigation |
| Script, gzip | 244.0 to 252.6 kB | 187.8 to 194.6 kB; a game's routes 246.0 kB |

## What changed

- **Navigation**: `Link`'s click draws the next route's outline in the browser at once, inside `document.startViewTransition`; the page tapped on stays mounted and hidden until the router commits, and a second transition swaps the outline for the page (`components/pending/`, `lib/pending-route.ts`). Under `prefers-reduced-motion`, or without the API, both swaps are plain. A game's tabs, which the page already holds, are drawn at the tap.
- **Cached largest paint**: the stylesheet is in the document (`experimental.inlineCss` and the `inlineStylesheets()` plugin in `apps/web/vite.config.ts`), so the first paint no longer waits a second round trip. It is sent once, not twice (the baseline's "Other findings", 1).
- **Script**: zod is off every route but the game's; the Scoreboard's socket is `partysocket` alone, not `agents/react`; the phone menu is the browser's `<dialog>`, not base-ui's; `Button` and `Badge` are plain elements and no longer client components. `/_next/static/*` is kept by the browser for a year ("Other findings", 2).
- **Shifts on load**: a time keeps the width the server's Eastern form took (`LocalTime`); the ticker and `/nhl/live` take their order once a page, so a favorite read after the first paint is marked where it stands; the dashboard's Favorites section holds the room of its four rows; the Scoreboard provider's first-paint updates run in a transition, so React no longer draws a Suspense fallback again at hydration.

## Script: sent, and the budgets now

A route may not send more than its baseline budget, and none does. The budgets are lowered to what this run measured, rounded up to a whole kB, plus 2 kB of headroom (`SCRIPT_HEADROOM_KB`): a build's chunk boundaries move a few hundred bytes with no change of ours, and a small component should not need a new number. `SCRIPT_BUDGETS_KB` in `scripts/performance/budgets.ts` holds them, the baseline's stay as `BASELINE_SCRIPT_BUDGETS_KB`, and `budgets.test.ts` holds the new ones to `results/after-local.json` and below the baseline's.

| Route | Script files | Baseline gzip kB | Baseline budget | Now gzip kB | **Budget now** | Document gzip kB |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | 39 → 37 | 251.3 | 252 | 194.6 | **197** | 13.2 → 25.7 |
| `/nhl` (both tabs) | 29 → 28 | 244.0 | 244 | 187.8 | **190** | 13.1 → 24.9 |
| `/nhl/live` | 33 → 31 | 246.8 | 247 | 189.9 | **192** | 11.6 → 24.3 |
| `/nhl/teams/:id` (and `/roster`, `/stats`) | 36 → 33 | 248.6 | 249 | 191.3 | **194** | 22.3 → 34.6 |
| `/nhl/games/:id` (and `/scoring`, `/pick`, a scheduled game) | 33 → 31 | 252.6 | 253 | 246.0 | **248** | 27.8 → 41.2 |
| `/players` (and a search) | 36 → 34 | 250.9 | 251 | 194.0 | **196** | 5.2 → 16.3 |
| `/players/:id` (and `/games`) | 30 → 29 | 244.6 | 245 | 188.5 | **191** | 12.8 → 24.1 |

- **A game's routes are 246.0 kB, 7 kB under their baseline budget, and 52 to 58 kB over every other route.** They lost what the others lost (about 57 kB) and gained the work merged since the baseline: the rink's animations (#141), penalties (#143) and the goal sequence (#142). Before #142 was merged the same build sent 244.2 kB. What only a game loads: zod (the one place the browser parses anything), the game page, and the rink's player.
- **Every document is about 11 to 13 kB larger gzipped**: the stylesheet, 9.8 kB, is now in it, and no longer a file the browser keeps between pages. That is the price of the first paint not waiting a round trip (562 ms on this profile); #138's look is the rest.

## Misses that stand

1. **`/nhl/live` moves by 0.1506 as scores arrive** (budget zero). A game that goes live or final leaves one section and joins another, and the sections below move. It is the page's design and Ryan's decision, recorded on #55; this ticket was told not to regroup the page. The baseline's recommendation stands: one ledger in start order, the status changing in its own cell.
2. **The deployed site was not measured again.** This branch is not deployed. The deployed re-measurement, signed in and signed out, is #144's. Two of the baseline's findings exist only there and are therefore not shown fixed here: the scoring tab's late largest paint (item 7: 2.0 s deployed, cause not established; locally it is 824 to 900 ms) and the theme toggle's one 200 ms on a team's page (item 8: 104 to 112 ms locally in this run).
3. **The analytics beacon** Cloudflare adds at the edge (about 10 kB gzipped on every deployed route) is in no local build and so in none of these numbers. Whether it counts against a route's budget, and whether it stays, is Ryan's (#55). With it a deployed route would send about 198 to 205 kB (a game's 256), which is over the new budgets and, on a game's routes, over the baseline's 253.
4. **The dashboard's favorites still arrive after the page hydrates**, 6.7 s after the first byte on this profile. The budget is met: the largest paint is now 820 ms, the browser's largest element being the picks record and no longer the favorite's row, and the section holds the room of four rows from the first paint, so nothing moves (0.0000). What a visitor waits for has not changed, and a visitor with fewer than four favorites sees blank rows under the section. The root fix is #132: Favorites belong to the Account and the server draws them.
5. **The pick tab's shift (0.0087 in the baseline) is gone, and its cause was not proved.** It was not reproduced before the fix; the Scoreboard provider's transition removes the same signature (a Suspense fallback drawn again at hydration, the footer moving twice) where it was reproduced, on `/nhl/live`. Three runs, cached and rendered: 0.0000.
6. **Back and forward get no outline and no view transition.** Only a tap on a `Link` does: the browser restores a page it has kept, with its scroll, and nothing is waited for.

## Without a budget, and worth knowing

- **A page still hydrates 4.2 to 6.7 s after its first byte locally** (4.3 to 7.0 s in the baseline). The script is 55 kB smaller and the number barely moved: the local preview is HTTP/1.1, six requests at a time, each behind 562 ms of latency, so the count of files (28 to 37) decides it, not their size. The deployed site, on HTTP/2, was 3.4 to 3.9 s; what the smaller script is worth there is for #144 to measure. The baseline proposed a budget of 3 s; none was set here, since it can only be judged deployed.
- **The next page's content arrives a little later than it did**: 63 ms at the median (695 to 1819 ms against 661 to 1750), the cost of two view transitions on a slowed processor. One navigation is clearly slower: a team's stats tab to its schedule, the heaviest page of the site, 1070 to 1121 ms in the baseline, 1780 to 2188 ms in this run and 1263 to 1570 ms run alone three times afterwards. The page arrives with its own placeholder at about 0.8 s, as before, and its 190 rows are drawn 0.45 to 0.7 s later. The shell is at 83 to 89 ms, where it was 739 to 748.
- **A second tap during a navigation** draws the second link's outline; a tap back to the page tapped on shows that page again; a navigation not arrived in 10 s shows the page tapped on again; one whose request fails is loaded by the browser as a document (vinext's own fallback). `scripts/navigation-check.mjs` tries each of these.

## Limits

The baseline's "Limits of the method" all apply. Two matter more now:

- The "shell" is the first frame in which `<main>`'s heading, placeholders or length of text differ from the page tapped on. It reads hidden content too, and the page tapped on now stays in `<main>`, hidden, under the outline. The passing numbers were therefore checked by eye: `scripts/navigation-check.mjs` screenshots each outline 600 ms after the tap, with the router's answer held back 1.5 s, at 390 and 1440 wide in both themes, and the outline is on screen in every one.
- "Blank frames" counts a frame in which `<main>` has no text or is under 40px tall. With the old page kept in `<main>` the text is never empty, so only the height says anything; the screenshots are the better evidence here too.
