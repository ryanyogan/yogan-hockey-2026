# Performance baseline (#126)

Every route measured against the budgets of PRD #123, before any of that PRD's work. Nothing is fixed here: each miss has its cause and a proposed fix, for #127 to act on. The final audit repeats the same commands and compares.

Measured 2026-10-11 at commit `9298c0f` (main), vinext 1.0.1.

**Since then**: #127 acted on it. The same routes measured again, beside these numbers, with the misses that stand and the script budgets as they now are, are in `after.md`. The script budgets below are the baseline's (`BASELINE_SCRIPT_BUDGETS_KB`); today's are lower.

## Repeat it

```sh
export TMPDIR="$PWD/node_modules/.tmp" && mkdir -p "$TMPDIR"
PORT=<your port> scripts/performance-baseline.sh local      # about 50 minutes
scripts/performance-baseline.sh deployed                    # about 50 minutes, reads only
```

Each writes `docs/performance/results/<target>.json` and `<target>.md` (every table below, plus each tap, navigation and layout shift). Flags after the target go to `scripts/measure-performance.ts`: `--only='/nhl,/players'` for some routes (the `route` names of `scripts/performance/routes.ts`; a name that matches none stops the run and lists them), `--runs=1`, `--out=node_modules/.tmp/try` to leave the committed results alone, `--favorites=off`.

- **local** builds this checkout with `ESPN_FIXTURES=1`, serves it with `vite preview` on `PORT+10000` behind `scripts/performance/compressing-proxy.ts` on `PORT` (both ports must be free: it refuses to start otherwise, and stops only the two servers it started), migrates the local D1 the build reads, seeds the sample picks and archives the recorded finished game (`scripts/performance/prepare-fixtures.ts`), measures, and stops both servers.
- **deployed** measures `https://hockey.yogan.dev` as it stands, with GET requests and the Scoreboard's socket only. It first writes `results/deployed-first-byte.md` (`scripts/performance/deployed-first-byte.sh`, no throttling).

After a local run, delete `apps/web/.cloudflare/state` before running Playwright: the build leaves the finished game archived in Agent state that `pnpm dev` shares, and three game specs fail until it is gone.

Run it on a machine doing nothing else. Other worktrees were building and testing on this one during both runs, so treat a difference under about 10% as noise.

## Profile and method

**Profile**: Lighthouse's mobile profile, applied through the DevTools protocol by Playwright's Chromium (`PROFILE` in `scripts/performance/budgets.ts`): a 412 x 823 viewport at 1.75x with touch and a phone's user agent, the CPU slowed 4x, and "Slow 4G" on every request (562.5 ms latency, 1.47 Mbps down, 675 Kbps up, which is DevTools' form of a 150 ms round trip at 1.6 Mbps). The time zone is America/Chicago, so every time the server wrote as "ET" changes when the page hydrates. The machine was an Intel i7-7700 (8 threads); a 4x slowdown of it is somewhat faster than a real mid-range phone.

**A visitor with favorites**: `favorite_teams=["21"]` and `favorite_players=["4024123"]` are in localStorage before each load, because a family member has favorites and they reach the page after it hydrates.

**Per route, three times, each in a new browser profile with nothing cached** (times are the median run, a shift is the worst run):

| Budget | How it is measured |
| --- | --- |
| Layout shift, on load | The browser's `layout-shift` entries (not after input), summed from the first byte until the page has its content, has hydrated, the Scoreboard's socket has spoken and 3 quiet seconds have passed. |
| Layout shift, as live data arrives | Then a changed slate is pushed down the page's own Scoreboard socket (the first game goes live 2-1, the second goes final 4-1, then a "heard" time) and the entries of the next 3 seconds are summed. |
| Largest paint | The last `largest-contentful-paint` entry before any input. |
| Interaction | Each control is tapped (the theme toggle, the ticker's "all games", the menu, and the route's own: a favorite heart, a goal on the timeline, a letter in the search) and the slowest Event Timing entry is taken: tap to next paint, what INP is made of. |
| Navigation | In a second new profile, after hydration, a link in the page is tapped and every frame watched: "shell" is the first frame that differs from the page tapped on, "content" the first with the next page whole, a "blank frame" one where `<main>` is empty. Whether `document.startViewTransition` ran is recorded. |
| Script size | Every script the load asked for, as sent (bytes) and gzipped at level 9 by the script itself, so the number does not depend on the server's compression. |

**Cached and rendered**: a route the page cache keeps (`pagePolicy` in `apps/web/lib/page-cache.ts`) is measured twice: answered from the cache (`x-page-cache: hit` or `stale`, asked for once beforehand) and rendered (`?uncached=<n>`, a parameter the page does not read, which gives `bypass`). `/`, `/nhl/live`, a search and a game not yet archived are rendered for every request.

**What "zero" and "at once" mean here** (decisions, the PRD gives no number): a layout shift is zero when it prints as 0.000 (under 0.0005; the browser reports 0.00008 for a clock changing width); the next shell is "at once" inside the interaction budget, 200 ms from the tap, with no blank frame.

**Limits of the method**

- Under DevTools throttling the document's own first byte is not delayed in Navigation Timing (the latency lands on its body), so no first-byte column is printed from throttled runs. `deployed-first-byte.md` has real ones.
- `vite preview` compresses nothing; production sends Brotli. The proxy gzips at level 6, so local times err slightly slow. Without it the largest paint read 2.3 s instead of 1.6 s.
- A game in progress was not measured: no recorded fixture has one (build notes, "ESPN"). The live game page's shift as plays arrive is unknown. `e2e/game-driver.ts` can drive one against a dev server; it needs a build to count.
- Not routes of the site, not measured: `/skeleton/*` (scaffolding), `/picks` (JSON), the not-found and error pages.
- A second visit with the browser's cache warm was not measured (see "Other findings", 2).
- A tap is read 1.2 s after it. One whose next paint came later than that would have no entry yet and be recorded as 16 ms (the least the browser reports). No tap here is near it, but a 16 in a later run deserves a second look.
- The "shell" is the first frame in which `<main>`'s heading, placeholders or length of text differ from the page tapped on. Text that changes by itself after the tap (a clock, a score) would count. It did not here (shell and content are the same frame on most rows), but once shells are drawn at the tap, check a passing number against the frames in the JSON.
- On the deployed site "open the whole slate" was not found on any row (`n/a` in `results/deployed.md`: the selector matched nothing visible, and why was not looked into), so deployed interaction rests on the theme toggle, the menu and each route's own control: 77 medians, against 105 locally.
- The JSON does not record the commit measured. It is the line at the top of this file.

## Local build, fixture data

From `results/local.md`. A miss is bold with a cross.

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
| `/nhl/games/401892449` (scheduled) | rendered (miss) | 1524 | 1524 (2500) | **0.0014** ✗ | 0.0000 | 88 (open the whole slate) | **842** ✗ | 0 | no | 252.1 |
| `/players` | cached (hit, stale) | 1572 | **1572** ✗ (1500) | 0.0000 | 0.0000 | 72 (open the whole slate) | **701** ✗ | 0 | no | 250.9 |
| `/players` | rendered (bypass) | 1556 | 1556 (2500) | 0.0000 | 0.0000 | 64 (open the whole slate) | **706** ✗ | 0 | no | 250.9 |
| `/players?q=mar` | rendered (bypass) | 1572 | 1572 (2500) | 0.0000 | 0.0000 | 64 (open the whole slate) | **822** ✗ | 0 | no | 250.9 |
| `/players/4024123` | cached (hit) | 1588 | **1588** ✗ (1500) | 0.0000 | 0.0000 | 88 (theme toggle) | **1614** ✗ | 0 | no | 244.6 |
| `/players/4024123` | rendered (bypass) | 1588 | 1588 (2500) | 0.0000 | 0.0000 | 72 (open the whole slate) | **1637** ✗ | 0 | no | 244.6 |
| `/players/4024123/games` | cached (hit) | 1584 | **1584** ✗ (1500) | 0.0000 | 0.0000 | 72 (theme toggle) | **666** ✗ | 0 | no | 244.6 |
| `/players/4024123/games` | rendered (bypass) | 1592 | 1592 (2500) | 0.0000 | 0.0000 | 80 (theme toggle) | **680** ✗ | 0 | no | 244.6 |
| `/players/3067313` (goalie) | cached (hit) | 1588 | **1588** ✗ (1500) | 0.0000 | 0.0000 | 72 (theme toggle) | **1647** ✗ | 0 | no | 244.6 |
| `/players/3067313` (goalie) | rendered (bypass) | 1600 | 1600 (2500) | 0.0000 | 0.0000 | 80 (theme toggle) | **1604** ✗ | 0 | no | 244.6 |

**In short**: interaction passes everywhere (slowest tap 104 ms against 200). A rendered page's largest paint passes everywhere but the dashboard. A cached page's largest paint misses on every route by 12 to 128 ms. Navigation misses on every route: 0.66 to 1.65 s with nothing shown and no view transition. Layout shift misses on five routes on load (seven rows: `/`, `/nhl/live`, a team, a finished game's pick tab, a scheduled game) and on `/nhl/live` as scores arrive.

One number has no budget and explains most of the misses: **a page hydrates seconds after it paints**: 4.3 to 7.0 s here ("Taps work from ms" in `results/local.md`), 3.4 to 3.9 s on the deployed site, which is the truer figure (see below: the local preview is HTTP/1.1). Until then a button does nothing and a tap on a link loads a whole document. Every load shift in the table happens at that moment.

## Deployed site

`https://hockey.yogan.dev` on real data, measured 2026-10-11 19:48 to 20:24 UTC from Ryan's machine (Chicago; the edge answered from ORD), with the same throttling laid over the real network. Full tables: `results/deployed.md`.

**It was not the baseline commit.** `main` moved during the day: the deployed Worker already carried #147 (install to a home screen), and #148 (the animated rink) was merged at 20:11 UTC, inside the run. Its script is 10.1 to 10.7 kB larger than the local build's on every route (254.6 to 262.7 kB gzipped), so every row of `results/deployed.md` is marked over its script budget. Nearly all of that is not ours: Cloudflare Web Analytics adds its beacon to every deployed document (`static.cloudflareinsights.com/beacon.min.js`, one more file, 31.6 kB, about 10.1 kB gzipped), which no local build has. A local build of `main` with #147 and #148 sends 251.6 kB on `/players` against the baseline's 250.9 (one run, in review). So the local table is the before-and-after reference; this one shows what the real edge changes: HTTP/2, Brotli, and a real cached-against-rendered difference.

| Route | Page | Largest paint ms (budget) | Shift on load | Shift as scores arrive | Slowest tap ms | Next shell ms | Hydrated ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | rendered | 1712 (2500) | **0.0209** ✗ | **0.0030** ✗ | 72 | **759** ✗ | 3911 |
| `/nhl` | cached | **1720** ✗ (1500) | 0.0000 | **0.0030** ✗ | 80 | **1582** ✗ | 3781 |
| `/nhl` | rendered | 1628 (2500) | 0.0000 | **0.0030** ✗ | 120 | **1543** ✗ | 3725 |
| `/nhl?tab=teams` | cached | **1644** ✗ (1500) | 0.0000 | **0.0030** ✗ | 64 | **1594** ✗ | 3684 |
| `/nhl/live` | rendered | 1740 (2500) | 0.0000 | **0.0490** ✗ | 96 | **748** ✗ | 3492 |
| `/nhl/teams/21` | cached | **1744** ✗ (1500) | **0.0048** ✗ | **0.0030** ✗ | 104 | **758** ✗ | 3800 |
| `/nhl/teams/21` | rendered | 1688 (2500) | **0.0048** ✗ | **0.0030** ✗ | **200** ✗ | **803** ✗ | 3755 |
| `/nhl/teams/21/roster` | cached | **1708** ✗ (1500) | 0.0000 | **0.0030** ✗ | 72 | **716** ✗ | 3472 |
| `/nhl/teams/21/stats` | cached | **1632** ✗ (1500) | 0.0000 | **0.0030** ✗ | 72 | **760** ✗ | 3483 |
| `/nhl/games/401803652` | cached | **1724** ✗ (1500) | 0.0000 | **0.0030** ✗ | 80 | **744** ✗ | 3628 |
| `/nhl/games/401803652/scoring` | cached | **2008** ✗ (1500) | 0.0000 | **0.0030** ✗ | 72 | **757** ✗ | 3532 |
| `/nhl/games/401803652/pick` | cached | **1740** ✗ (1500) | 0.0000 | **0.0030** ✗ | 80 | **734** ✗ | 3410 |
| `/nhl/games/401892482` (scheduled) | rendered | 1992 (2500) | **0.0015** ✗ | **0.0030** ✗ | 64 | **1509** ✗ | 3459 |
| `/players` | cached | **1688** ✗ (1500) | 0.0000 | **0.0030** ✗ | 64 | **692** ✗ | 3410 |
| `/players?q=mar` | rendered | 1712 (2500) | 0.0000 | **0.0030** ✗ | 72 | **758** ✗ | 3736 |
| `/players/4024123` | cached | **1720** ✗ (1500) | 0.0000 | **0.0030** ✗ | 72 | **1545** ✗ | 3496 |
| `/players/4024123/games` | cached | **1756** ✗ (1500) | 0.0000 | **0.0030** ✗ | 72 | **789** ✗ | 3363 |
| `/players/3067313` (goalie) | cached | **1796** ✗ (1500) | 0.0000 | **0.0030** ✗ | 88 | **1624** ✗ | 3453 |

The rendered rows left out here are in `results/deployed.md`: their largest paint is within 60 ms of the cached row's, their next shell within 120 ms. No blank frame and no view transition on any row.

What differs from the local table, and why:

- **Hydration is 3.4 to 3.9 s, not 4.3 to 7.0 s.** The local preview speaks HTTP/1.1, six requests at a time, so 30 to 39 script files queue behind 562 ms of latency each; the edge sends them on one HTTP/2 connection. The deployed number is the true one; the local one is only comparable with itself.
- **Largest paint is 130 to 300 ms over the cached budget** (1.63 to 1.80 s; 2.0 s on the scoring tab, whose largest element is painted late), a little worse than local: a real round trip under the throttle's.
- **The ticker moves by 0.0030 on every route as scores arrive**: the one game still to come (CAR at PHI) took the lead when it went live. Local missed it only by chance of order (item 6).
- **The dashboard's largest paint passes (1.7 s) but its shift is 0.0209**: with real data the favorites ledger arriving at hydration pushes the standings down further. The largest element differs with the data; the mechanism is item 3's.
- **One tap of the 77 measured reached the budget**: the theme toggle on the rendered team page, 200 ms, against 104 ms on the cached pass of the same page and 104 ms locally. It is a median of three runs, so at least two of them took that long; other work was running on the machine, but that is not established as the cause. It is the heaviest restyle on the site (190 rows). Cause and fix: item 8.

**First byte, no throttling** (`results/deployed-first-byte.md`, ms after the TLS handshake, median of 7): a cached answer 69 to 119 ms; rendered 83 to 369 ms (`/players` 83, a team's pages 198 to 369, a finished game's 228 to 286, a player's 171 to 206); never cached, `/` 280 to 306 and `/nhl/live` 94 to 124. So on the deployed site the cache is worth 90 to 280 ms on every route but `/players` (8 ms), which on this profile is hidden behind 1.1 s of round trips.

## Script size: the measurement, and the budget it sets

The budget is the gzipped script a route sent in this baseline, rounded up to a whole kB (`scriptBudgetKb`). The numbers are `SCRIPT_BUDGETS_KB` in `scripts/performance/budgets.ts`, one a route; `judge()` marks a route that sends more as a miss in both tables of a later run, until the budget is changed there on purpose (a test holds the numbers to `results/local.json`). The numbers are of the local build at the baseline commit. The deployed site sends about 10.6 kB more: about 10 kB is the analytics beacon Cloudflare adds at the edge, the rest is #147 and #148. The budgets are for the local build, which is what the baseline command measures; whether the beacon counts against them, or is worth its 10 kB, is a question for #127 to put to Ryan.

| Route | Script files | Script kB | Script gzip kB | **Budget, gzip kB** | Document kB | Document gzip kB |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | 39 | 798.5 | 251.3 | **252** | 128.6 | 13.2 |
| `/nhl` (both tabs) | 29 | 783.1 | 244.0 | **244** | 168.9 | 13.1 |
| `/nhl/live` | 33 | 789.7 | 246.8 | **247** | 134.6 | 11.6 |
| `/nhl/teams/:id` (and `/roster`, `/stats`) | 36 | 793.2 | 248.6 | **249** | 384.1 | 22.3 |
| `/nhl/games/:id` (and `/scoring`, `/pick`, a scheduled game) | 33 | 807.7 | 252.6 | **253** | 294.3 | 27.8 |
| `/players` (and a search) | 36 | 798.2 | 250.9 | **251** | 44.1 | 7.6 |
| `/players/:id` (and `/games`) | 30 | 784.4 | 244.6 | **245** | 142.9 | 12.9 |

The stylesheet is 38.6 kB (8.1 kB gzip) and is sent twice (see "Other findings", 1).

Where the 244 kB every route sends comes from (chunks of the build, gzip -9; names lose their hashes):

| Chunk | gzip kB | What it is | Ours to cut? |
| --- | --- | --- | --- |
| `framework` | 67.5 | React and React DOM | no |
| `vinext` | 41.1 | vinext's router and `next/*` shims | no |
| `index` | 38.5 | vinext's browser entry and the RSC client | no |
| `src` | 27.4 | **zod and the whole `@yogan-hockey/schemas` barrel** | yes: only the game page parses anything in the browser; every other route gets it through `app/error.tsx` → `lib/error-page` → `lib/nhl-page` (one enum) and `lib/dashboard` |
| `react` | 24.0 | **`agents/react` and partysocket** (`useAgent`) | yes: the provider only reads `cf_agent_state` and one message of its own |
| `mobile-menu` | 17.5 | **`@base-ui/react/dialog` and floating-ui**, for the phone menu | yes |
| `dist` | 10.4 | tailwind-merge (the `cn` helper) | partly |
| `hybrid-client-route-owner`, `link` | 11.0 | vinext's client route owner, `next/link` | no |
| the rest, about 20 files | about 7 | our components | small |

So about 158 kB is React and vinext, and about 80 kB is three libraries and a class-name helper. `game-page` adds 8.0 kB on a game.

## Client components

Every module with `"use client"` at the baseline commit: 31, none in `packages/db`, `espn` or `schemas`. "Every route" means it is in the root layout's tree.

| Module | On | Why it runs in the browser | Could be a server component? |
| --- | --- | --- | --- |
| `app/error.tsx` | every route | An error boundary must be a client component; "Try again" and the reset on navigating away. | No. But it pulls zod into every route (above). |
| `app/global-error.tsx` | when the root layout fails | The framework requires it; the reload button. | No |
| `components/scoreboard/scoreboard-provider.tsx` | every route | Holds the one Scoreboard socket and feeds every live score. | No. Its `useAgent` is the 24 kB. |
| `components/scoreboard/score-ticker.tsx` | every route | Live scores from the socket, the measured "+N", the wheel, the open slate. | No |
| `components/scoreboard/scoreboard-notice.tsx` | every route | Says "reconnecting" when the socket has dropped. | No |
| `components/shell/nav-links.tsx` | every route | Marks the current item; the layout does not render again on navigation. | No |
| `components/shell/mobile-menu.tsx` | every route | The phone menu opens, and closes on navigation, Escape or a tap outside. | No, but a native `<dialog>` or popover needs no 17.5 kB library. |
| `components/shell/theme-toggle.tsx` | every route | Switches and remembers the theme (next-themes). | No |
| `components/link.tsx` | every route | Prefetches the page on hover, focus or press, never for being on screen. | No. Every row's link is a client boundary in the RSC payload. |
| `components/local-time.tsx` | every route | Only the browser knows the visitor's time zone. | No |
| `lib/use-favorites.ts` | every route | The one reader and writer of favorites in localStorage. | Goes when Favorites move to the Account (#123). |
| `lib/use-refresh-on-invalidation.ts` | every route | Renders the server components again when a game goes final. | No |
| `lib/use-drop-watch.ts` | every route | Times how long a socket has been down. | No |
| `components/dashboard/tonight-games.tsx` | `/` | The rows are the socket's games; favorite teams are marked from localStorage. | No |
| `components/dashboard/dashboard-favorites.tsx` | `/` | Favorites are in localStorage; the "live" mark is the socket's. | **Mostly, once Favorites are the Account's**: the ledger can be drawn by the server and only the live mark stay. |
| `components/favorites/use-favorite-players.ts` | `/`, `/players` | Resolves the browser's ids to player rows after hydration (a Server Action). | **Goes with Account Favorites.** |
| `components/favorites/favorite-heart.tsx` | team, player, `/players`, `/` | Pressing it writes localStorage; it fills after hydration. | No (becomes a Server Action's button). |
| `app/players/favorite-players.tsx` | `/players` | The favorites list, from localStorage. | **Yes, with Account Favorites.** |
| `app/players/player-search.tsx` | `/players` | Search as you type: a debounced Server Action and the address rewritten. | No |
| `components/scoreboard/live-scores.tsx` | `/nhl/live` | The page is the socket's slate, regrouped as statuses change. | No |
| `components/team/team-now.tsx` | team | A cached page gets "playing now" and its pick after paint, from the socket and `/picks`. | No |
| `components/team/team-tabs.tsx` | team | The layout persists across tabs, so the current tab is read in the browser. | No |
| `lib/use-slate-picks.ts` | team | Reads picks after first paint on a cached page. | No |
| `components/game/game-page.tsx` | game | Opens the Game Agent's socket when the game starts; scheduled, live and finished without a reload. | No. The matchup and the pick are already server-rendered slots. |
| `components/game/game-view.tsx` | game | A tapped tick or play moves the rink; the list grows as plays arrive. | No |
| `components/game/finished-game.tsx` | game | Asks until a just-finished game's replay is saved. | No |
| `components/game/replay.tsx` | game | Play, pause, speed and seek. | No |
| `lib/game/use-game-stream.ts` | game | The Game Agent's socket. The one place zod is used in the browser. | No |
| `packages/ui/.../button.tsx` | every route | Nothing of its own: wraps `@base-ui/react/button`. | **Yes**: a native `<button>` with `buttonVariants`; every importer outside `/skeleton` is already a client module. |
| `packages/ui/.../badge.tsx` | game (a pick), `/skeleton` | Nothing of its own: calls base-ui's `useRender` for one static label. | **Yes**: a plain `<span>`. No caller passes `render`. |
| `app/skeleton/pulse-live.tsx` | `/skeleton` only | Scaffolding. | Not a page of the site. |

Not marked but shipped, because only client modules import them: `game-rink.tsx`, `plays-list.tsx`, `period-timeline.tsx`, `player-ledger.tsx`, `game-ledger.tsx`, `packages/ui`'s `ledger.tsx`, and the `lib/` code behind them. `next-themes`' `ThemeProvider` is the root layout's other client component.

**Added since the baseline** (on `main` when this was merged, not in the table or the local numbers above): `components/shell/theme-color.tsx` (#147, every route: the browser bars' colour follows the theme shown, known only after hydration; no), `components/game/rink-animations.tsx` (#148, game: plays the rink's animations and fetches GSAP on the first cue; no), and `components/game/game-rink.tsx`, which #148 marked `"use client"` itself (it was already shipped, as the paragraph above says).

## Each miss: cause and proposed fix

Ordered by what a visitor feels most. "Run" is the command that shows it alone.

### 1. Navigation shows nothing for 0.7 to 1.6 s, and has no view transition (every route)

- **Measured**: tap to the first changed frame 661 to 842 ms, 1.6 s from a player to his team. "Shell" and "content" are the same frame on 24 of 28 rows: the next page arrives whole, no placeholder is ever drawn. No blank frame: the old page stays, with no sign the tap was heard. `document.startViewTransition` never runs.
- **Cause**: `components/link.tsx` prefetches on press with `kind: "full"`, and the router shows nothing until that answer is in. On a phone the press and the tap are one gesture, so the prefetch saves nothing: the wait is one round trip (562 ms) plus the render and the download (a team's first page is 22 kB gzipped, 384 kB to parse). A `loading.tsx` is only drawn if the answer streams it, which a prefetched full page does not.
- **Fix**: (a) draw the next route's outline in the browser at the tap, without a request: the outlines exist (`components/route-skeletons.tsx`, `components/team/team-skeletons.tsx`); a small client "pending route" holder in the shell, set on press by `Link` and cleared when the route commits, keyed by the href's pattern; (b) wrap that swap and the commit in `document.startViewTransition` (vinext 1.0.1 has no view-transition support of its own: nothing in its `dist/` calls it); (c) on a touch pointer ask for the default prefetch (the `loading.tsx` shell, which vinext answers before the page) rather than the full page, so a streamed answer can paint its outline first; (d) cut the team page's document (item 9). Budget to meet: shell under 200 ms, which only (a) can do on this network.
- **Run**: `--only='/players/:id (skater)'`, table "Every navigation".

### 2. Pages hydrate at 3.4 to 3.9 s deployed, 4.3 to 7.0 s locally (every route; no budget, but the cause of items 3 to 5)

- **Cause**: 244 to 253 kB of gzipped script in 29 to 39 files on a 1.47 Mbps line (about 1.4 s of bandwidth, shared with the stylesheet and the font; locally also six requests at a time), then React hydrating the whole document on a slowed CPU: `/nhl` (169 kB of markup, every row's link a client component) takes 6.0 s where a game takes 4.3 s.
- **Fix**: cut the script (the table above: zod off every route but the game by importing `StandingsViewSchema`'s values from a file with no zod and giving `packages/schemas` `"sideEffects": false` and per-file exports; replace `useAgent` in the Scoreboard provider with a bare `PartySocket`/`WebSocket` that reads two message types; replace the base-ui dialog with a native `<dialog>`; `button.tsx` and `badge.tsx` as plain elements). That is about 70 kB of 244. Then fewer client boundaries in long tables (a plain `<a>` for ledger rows with one delegated listener on the table for intent prefetch). **Propose a budget for #127: hydrated under 3 s on this profile.**
- **Run**: any route; "Taps work from ms" in "Paint and hydration".

### 3. Dashboard: largest paint 8.3 s locally (budget 2.5 s), and a shift of 0.0038 locally, 0.0209 deployed

- **Measured**: first paint 1.56 s; the largest paint is the favorite player's row (`div[ledger-detail] "3 GP · 1 G · ..."`), drawn at 8.3 s. The standings below it move by 0.0008 as it arrives.
- **Cause**: favorites are in localStorage. `DashboardFavorites` waits for hydration (7.0 s), then a Server Action (`resolveFavoritePlayers`, one more round trip), then draws a ledger taller than what held its place.
- **Fix**: PRD #123's own: Favorites belong to the Account and are "in the page from its first paint". The server draws the favorites ledger; `use-favorite-players.ts` goes. Until then, or for a visitor with none, the section's placeholder must be the height of what replaces it. Without favorites the dashboard's largest paint is its first paint (`--favorites=off`).
- **Run**: `--only=/`.

### 4. Cached pages: largest paint 1.51 to 1.63 s (budget 1.5 s)

- **Measured**: largest paint equals first paint on every cached route; the page is whole in the document. Cached and rendered differ by under 30 ms locally, because the local render is fast; the deployed site's difference is in `results/deployed-first-byte.md`.
- **Cause**: the first paint waits for the stylesheet, a second round trip after the document: 562 ms + 562 ms + the downloads, with the stylesheet sent twice (two links to identical files, 8.1 kB gzipped each) and sharing the line with the font preload and 250 kB of module preloads that start at the same moment. Then the slowed CPU lays out 70 to 380 kB of markup.
- **Fix**: (a) send the stylesheet once (below, 1); (b) inline it in the document (8 kB gzipped against a 562 ms round trip), which should put first paint near 0.8 s; or, less, (c) keep it external and stop the module preloads competing with it (fewer, smaller scripts: item 2). (a) and (c) alone are worth roughly the 30 to 130 ms missing; (b) is the one with room to spare.
- **Run**: `--only=/nhl`.

### 5. Things that move when the page hydrates

| Route | Shift | What moves | Cause | Fix |
| --- | --- | --- | --- | --- |
| `/`, `/nhl/live` (and any route, for a visitor with a favorite team playing) | 0.0030 | The ticker's entries | The favorite team's game gets its star and takes the lead once localStorage is read (`score-ticker.tsx`, `favoritesFirst`). | Account Favorites in the first paint for a rendered page. On a cached page the order cannot be known: keep the slate's order and mark the favorite in place, as the home ledger does since #111. |
| `/nhl/teams/:id` | 0.0048 | The schedule's time cells | `LocalTime` replaces "6:00 PM ET" with the visitor's "5:00 PM" and the column changes width. | A fixed width for a time cell (`ch` units in the mono face, wide enough for "12:00 PM ET"), so both forms occupy the same box. Same for the ticker (0.008 recorded in the build notes for a visitor with no favorites). |
| `/nhl/games/:id/pick` | 0.0087 cached, 0.0012 rendered | The footer, twice | Not established. `<main>` changes height at hydration (5.0 s) on this tab only; the plays and scoring tabs do not move. | Find it first: `--only=/nhl/games/:id/pick --runs=1`, then compare `main`'s height before and after hydration with `scripts/screenshot.mjs --eval`. |
| `/nhl/games/:id` (scheduled) | 0.0014 | A text node | Most likely the start time, by the same `LocalTime` replacement; not confirmed. | The fixed-width time above. |

### 6. `/nhl/live`: 0.1351 as scores arrive

- **Measured**: when one game goes live and another final, the "Upcoming" section, its rows and the footer all move.
- **Cause**: the page groups the slate into In progress, Upcoming and Final (`slateSections`), so a change of status takes a row out of one section and adds it, and perhaps a whole section with its header, to another.
- **Fix**: this is the page's design, so it is Ryan's call (noted on the pull request). Recommended: one ledger in the stable order the home page took in #111 (start time, then id), the status changing in its own cell, with the sections' counts as a line above. If the grouping stays, move rows with a transform (a view transition on the list) so nothing jumps under a finger; the browser does not count a transform as a shift.
- **The ticker, on every route of the deployed site (0.0030)**: an entry moves when its game goes live, because `tickerGames` puts live games first. The same fix: a stable order, the status changing in place.

### 7. The scoring tab's largest paint is 2.0 s on the deployed site (cached budget 1.5 s)

- **Measured**: first paint 1.74 s, as on the other tabs; the largest paint, 2.01 s cached and 1.98 s rendered, is a row of the scoring list (`span[play-row]`), about 270 ms after the first paint. Locally the two are the same frame (1.53 s).
- **Cause**: not established. The row is in the document, so something draws or redraws it after the first paint with real data that does not with the fixture.
- **Fix**: find it first: `node scripts/measure-performance.ts https://hockey.yogan.dev --only=/nhl/games/:id/scoring --runs=1 --out=node_modules/.tmp/try`, then a DevTools performance trace of that load on the same throttling. Item 4's fixes apply to it whatever the answer.

### 8. The theme toggle takes 200 ms on a team's page (deployed, rendered; budget under 200 ms)

- **Measured**: 200 ms as the median of three runs on the rendered pass, 104 ms on the cached pass and locally. The page has 190 ledger rows.
- **Cause**: switching the theme restyles every element on the page, and this is the page with the most. Whether the doubling was the machine's other work is not established.
- **Fix**: measure it again on an idle machine first (`--only=/nhl/teams/:id`). If it stands: the team page's document shrinks with item 9, and `content-visibility: auto` on the ledger sections below the fold keeps a restyle to what is on screen.
- **Run**: `--only=/nhl/teams/:id`, table "Every tap".

### 9. Not misses, but in the way

- A team's first page is a 384 kB document (22 kB gzipped), a finished game's 294 kB: the placeholder rows and the page are both in the markup and again in the RSC payload (build notes, #94). It is why a player-to-team navigation takes 1.6 s. Fewer placeholder rows and shorter class strings on ledger cells.

## Other findings

1. **The stylesheet is linked twice.** `/_next/static/css/global-error.<hash>.css` and `layout.<hash>.css` are byte-identical (39,555 bytes; `cmp` says so) and every document links both: `app/global-error.tsx` imports `globals.css` as the layout does. Both block the first paint. Fix: do not import the stylesheet in `global-error.tsx` (give it the few inline styles it needs), then check the build emits one file.
2. **Hashed script chunks are never kept by the browser.** The deployed site answers `/_next/static/chunks/framework-<hash>.js` with `cache-control: public, max-age=0, must-revalidate`, so every visit asks about all 30 to 39 files again (a round trip each, 562 ms on this profile, before hydration can start). `apps/web/public/_headers` gives only `/team-marks/*` a year. Fix: add `/_next/static/*` with `Cache-Control: public, max-age=31536000, immutable` and confirm with `curl -sD - -o /dev/null`. This matters most to the installed PWA of #123, and is why a repeat visit was not worth measuring before it is fixed.
3. **The finished game's pages have no `h1` or `h2` in `<main>`** once the game is archived (found because the script first waited for one). Not a performance matter; noted for the UI ticket.
4. **Interaction has room locally**: the slowest tap is 104 ms (the theme toggle on a team's 190-row page), most are 64 to 88 ms. The deployed run's one 200 ms is item 8.

## For #127

1. The budgets and the profile are `BUDGETS`, `SCRIPT_BUDGETS_KB` and `PROFILE` in `scripts/performance/budgets.ts`; `judge()` there is what marks a miss, script size included. Change a budget there and in this file together.
2. Work one item, then run that route alone (`--only=... --runs=1 --out=node_modules/.tmp/try`, two minutes) before a full run.
3. **Record the final run beside the baseline, not over it**: `scripts/performance-baseline.sh local --out=docs/performance/results/after-local` (and `deployed --out=docs/performance/results/after-deployed`). Without `--out` a run replaces `results/local.*`, which are the baseline and what the script budgets are tested against.
4. `main` is already a little over the script budgets (`/players`: 251.6 kB against 251, from #147 and #148, merged after the baseline), and the deployed site is about 10 kB further over for the analytics beacon. #127 starts from there: item 2's cuts are about 70 kB, so the budgets should be met and then lowered. Set the new numbers in `SCRIPT_BUDGETS_KB` from the final run, and point its test at that run's JSON.
5. The client components added since the baseline are listed under the table in "Client components".
6. Two causes are not established and say so: the pick tab's shift (item 5) and the scoring tab's late largest paint (item 7). Each has the command that shows it.
7. Decisions waiting on Ryan are in the pull request of #126: what "zero" and "at once" mean, the profile, and the grouping on `/nhl/live`.
