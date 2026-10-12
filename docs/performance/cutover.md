# The cutover measured (#193)

`main` (vinext, `304479b`) and the branch (`tanstack-start` at `3792185`, TanStack Start) measured side by side on 2026-10-12, in fixture mode, as production builds, with the baseline's profile and script. The recorded baseline (`baseline.md`) is the third column, from another machine and from before Agate.

- `results/cutover.md`: every metric in three columns, misses first. `results/cutover-main.*` and `results/cutover-branch.*`: each site's own tables and JSON.
- `results/cutover-server-time.md`: server time and document size, no throttling.
- `results/cutover-address-parity.md`: every address, status and `location` on both.

## Repeat it

```sh
git worktree add --detach ../main-for-measuring origin/main && (cd ../main-for-measuring && pnpm install)
PORT=<port> scripts/performance-compare.sh ../main-for-measuring        # about two hours
scripts/performance/serve-build.sh start ../main-for-measuring 5350 5351 && scripts/performance/serve-build.sh start . 5360 5361
node scripts/address-parity.ts http://localhost:5351 http://localhost:5361
node scripts/performance/server-time.ts http://localhost:5351 http://localhost:5361
```

## What the numbers rest on

- **Two or three runs a figure, not the baseline's three everywhere.** The measuring was stopped in its third round. Seven routes (Home, `/nhl` and its Teams tab, `/nhl/live`, a team's three tabs) have three runs on each side; the other ten have two. Each table says which. A route is in the third round only where `main`, the branch warm and the branch cold all finished it; one route's unfinished third round was left out whole.
- **Run in turn**: a route on `main`, then on the branch with KV warm, then on the branch restarted with KV emptied, then the next route. The machine's load was 1.3 to 4.3 throughout (another agent's test suites). The runs agree closely all the same: hydration within about 250 ms on a route, largest paint within 70 ms.
- **The recorded baseline is not today's `main`.** It was taken on an Intel i7-7700 before Agate; today's machine is a Ryzen AI 9 HX 370. `main` today hydrates up to 1.4 s later than the baseline on some routes and earlier on others, and paints first at about 2.45 s where the baseline says 1.55 s. The comparison that counts is today against today.
- **Conditions.** vinext answered from its page cache or rendered (`?uncached=`). The branch keeps no page (ADR 0009) and is rendered every time, with its ESPN reads in KV (warm) or not (cold). The branch warm is set against `main` at its quicker of cached and rendered. In fixture mode a cold read reads a recording, so "cold" here leaves out ESPN's own latency, which is most of a cold read in production.
- **Hydration is asked of the browser** (`scripts/performance/hydration.ts`): every link, button and field carries React's fiber. Each site's own mark is early: the branch's `__APP_HYDRATED_AT` (the shell) by 0 to 358 ms across the runs on this profile, 143 at the median and zero on the not-found page; vinext's `__NEXT_HYDRATED_AT` by 10 to 802 ms, 58 at the median. The baseline recorded only vinext's mark.
- **A navigation is timed by what `<main>` draws.** The script used to include the address, which TanStack's router changes at the tap: the 12 to 23 ms "next shell" recorded for `/nhl` in #187 was the address changing, not the page.

## What was found

**Script and hydration: no route misses.** Every route sends 192 to 216 kB gzipped against budgets of 244 to 253 (`main` today 230 to 254). Every route hydrates earlier than `main` today, by 0.6 to 3.4 s, and no route's runs overlap `main`'s. Largest paint is 1.53 to 1.60 s against `main`'s 2.40 to 2.52 s.

**Layout shift on load is worse on every route**, and the same in every run: 0.004 to 0.051 where `main` today has 0 on all but `/nhl/live` (0.0031), a team (0.0009) and the not-found page (0.0038). Worst: Home 0.0512, a team's tabs 0.028 to 0.029, a scheduled game 0.0266, `/nhl/live` 0.0133. Two things move:

- Between 3.3 and 5.0 s, after first paint (1.57 s) and before the shell hydrates, whole blocks move (a story on Home, the team's page under its header, a game's matchup). **Cause not established.** It is before any script of the page's runs, which points at the fonts arriving late on this network and swapping; `main` paints first at about 2.45 s and shows no such shift. No trace was taken.
- At hydration the score strip moves the favorite team's game to the front (0.0031) on every route with a strip. `main` does it only on `/nhl/live`: on its other pages the strip had no games until the socket spoke, by which time favorites were read. It comes with the games being in the first HTML. Removing it means either knowing favorites on the server (Account Favorites) or leaving the slate's order alone and marking the favorite in place, which changes behaviour. Not a few lines; not done.

**A tap on a team from another page takes about 1.25 s** (`/nhl`, `/nhl/live`, a scheduled game, a player's games) against about 0.7 s on `main`: two requests after the tap, one after the other, where `main` made one. Between a game's tabs it is 54 to 98 ms against about 740 ms. Elsewhere the two are within 100 ms. Both miss the 200 ms shell budget everywhere but a game's tabs, as the baseline did.

**Server time and document size** (`results/cutover-server-time.md`, 10 asks, no throttling, KV warm): the branch renders in 11 to 22 ms where `main` rendered takes 19 to 36 ms and `main` from its page cache about 5 ms. Documents are smaller: Home 68 kB against 128, a team 195 against 353, a player's default tab 95 against 175. With KV emptied the server time was not measured.

**Addresses** (`results/cutover-address-parity.md`): 147 asked, 132 the same, 3 different as intended (`/skeleton/loading`, two of vinext's `.rsc` addresses), **12 different and not intended**:

- A trailing slash is answered 307 where `main` answers 308 (nine addresses), and `/picks/` is answered 200 with the JSON where `main` redirects to `/picks`.
- `/NHL` is answered 200 with the standings where `main` answers 404: the router matches without regard to case.
- `/nhl/teams/%20` is answered 307 to `/nhl/teams` where `main` answers 404.

Not fixed here. The first two are the router's defaults (`trailingSlash`, `caseSensitive`) or a 308 in `worker.ts` beside the old links'; each wants a test.

**Fixed in #211** (`results/issue-211-address-parity.md`: the vinext site built from `304479b` against the fix, 160 addresses, the twelve and thirteen more of their kinds; 157 the same and the 3 intended). The Worker's entry answers a trailing slash with a 308 before the site is asked, the router matches by case, and the third was Start dropping a space from the end of a path, which the entry now keeps.

## Not measured

- A third run on ten routes; the branch's server time with KV emptied.
- A game in progress: no recording has one, as in the baseline.
- The cause of the shift before hydration; the site without favorites.
- Anything on a deploy: HTTP/2, Brotli, the real edge, a real phone.
- `scripts/measure-navigation.mjs` and `scripts/tap-targets.mjs` were changed and not run.
