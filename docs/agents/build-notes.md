# Build notes

What earlier tickets learned that the code does not show. Read before building; add a line when you learn something the next subagent would otherwise rediscover. Keep each note to what cannot be found by reading the code.

## Running things

- **Ports.** The dev server is pinned to `PORT` (default 5173) with `strictPort`. Parallel worktrees each use their own `PORT`; the orchestrator assigns it. vinext refuses a second dev server in the same directory, so stop strays before Playwright.
- **Killing strays.** `pkill -f` with a pattern that appears in your own command line kills your shell. Bracket one letter: `pkill -f "[v]ite dev"`.
- **`cf d1 migrations apply --local` fails to exit about half the time** (cf 1.0.0-beta.12). `apps/web/scripts/migrate-local.sh` retries it; call that, never the bare command, in anything Playwright or CI waits on.
- **`cf d1 migrations apply` accepts only a database id**, and `bindings.kv()` only an id. The D1 id in `cloudflare.config.ts` is a placeholder until #32 is done.
- **pnpm 12 fails install on unapproved build scripts.** Add new ones to `allowBuilds` in `pnpm-workspace.yaml`.
- **Playwright** needs `pnpm exec playwright install chromium` once per machine.
- **Harmless dev noise**: a `NOSENTRY RPC connection broken` line from workerd at startup, sourcemap warnings, React's `eval()` notice.

## vinext and the Agents

- **Typed Agent namespaces come from `exports`**: `getAgentByName(exports.SomeAgent, name)` with `exports` from `cloudflare:workers`. `env.SomeAgent` types as `DurableObjectNamespace<undefined>`.
- **`revalidateTag` outside a page request** returns `undefined` and leaves the write floating. Use `apps/web/lib/invalidate-tag.ts`, which makes it awaitable through an undocumented vinext import.
- **A Server Action that changes data through an Agent** must call `refresh()` from `next/cache`, or the page does not re-render.
- **shadcn Base UI components arrive without `"use client"`.** Rendered by a server component they fail with `createContext is not a function`. Add the line to each new component a server component renders.
- **The Workers-runtime tests do not read `cloudflare.config.ts`.** `apps/web/vitest.config.ts` repeats the bindings: each new Agent or binding goes in both. Its entry is `apps/web/agents/index.ts`, it aliases `next/cache` to `vinext/shims/cache`, and it runs on compatibility date 2026-08-22, the newest the pool's workerd accepts.
- **vitest is held at 4.x** because `@cloudflare/vitest-pool-workers` 0.22 requires it.

## D1

- **Migrations are additive only from `0000_init`.** #37 replaced the skeleton's migration with it, since nothing had been deployed. Change `packages/db/src/schema.ts`, run `pnpm db:generate`, commit the new file; never edit or regenerate an old one. A local database made before #37 has the old migration recorded: delete `apps/web/.cloudflare/state` once.
- **D1 takes at most 100 bound values in one statement.** A multi-row Drizzle insert of a 13-column table holds 7 rows, so `replaceGamePlays` sends a game as chunks inside one `db.batch`, which D1 runs as a transaction.
- **`packages/db` has its own Workers-runtime Vitest project** (`pnpm exec vitest run --project db`) with a D1 binding and no Worker entry. Its tests share one database, so each test uses ids of its own.
- **Write the game row before its plays**: `plays.game_id` references `games`. `predictions` references nothing, because a pick exists before its game is final.
- **ESPN's final score for a shootout already gives the winner the extra goal** (the summary header and the scoreboard both), so no finished game is tied. Do not take a final score from the last play: in event 401803652 the plays end 3-2 where the final is 4-3.
- **ESPN has no "penalty" play type.** Each infraction is its own type ("High-sticking", "Hooking"), which is why `Play` carries a `penalty` flag for the translation in #35 to set.

## ESPN

- **Fixture mode is `ESPN_FIXTURES=1`**, read by `packages/espn` from `process.env` on every read. Under `pnpm dev` and `pnpm build` the Worker never sees the shell's environment, so `apps/web/vite.config.ts` compiles the variable in with `define`: set it when the dev server starts, and restart to change it. In Vitest, the Workers pool included, `vi.stubEnv("ESPN_FIXTURES", "1")` works. A build without it contains no recorded response; keep the test written out inside `read` in `client.ts`, because behind a function the bundler keeps the fixtures.
- **Fixture mode answers only what is recorded**: the current scoreboard (the slate of 2026-10-06, nine games), the scoreboard of 2026-10-03, standings, the team list, and Toronto (team 21) with its schedule. Anything else is an `EspnFetchError` naming the missing file. To add one, add the endpoint to the list in `packages/espn/scripts/record-fixtures.ts` and run `pnpm record:fixtures`.
- **No recorded slate has a live game yet.** Every game in `scoreboard.json` is scheduled and every game in `scoreboard-20261003.json` is final; nothing was on when they were recorded. The live and postponed cases in `scoreboard.test.ts` change the status of a recorded game. Run `pnpm record:fixtures` during an evening of games, then `pnpm test -u`, and tickets that need a mixed slate get a real one.
- **Recording rewrites `scoreboard.json` with whatever is on**, so the snapshots and the literals in the tests that name its games change with it. The dated slate and the rest move only as the season does (standings, records, the schedule's results).
- **ESPN answers an unknown team id with HTTP 400**, not 404. `EspnFetchError.notFound` covers both; use it for the not-found page.
- **A scoreboard asked for by date has no `day`**, and a range (`dates=20261005-20261006`) is a 400. Catch-up fetches one date at a time.
- **ESPN names the same thing differently by endpoint.** A side's overall record is type `total` on a slate still to be played and `ytd` on a finished one and on a schedule; a score is `"3"` on the scoreboard and `{ value: 3 }` on a schedule; the scoreboard sends one `logo`, everything else a list of `logos`; the season type is inside `season` on the scoreboard and beside it on a schedule. `espn-game.ts` and `espn-team.ts` absorb all of it into one `Game` and one `Team`.
- **Standings come from `standings?level=3`** (conference, then division). The default response has no divisions. `standingsView` in `packages/schemas` ranks the rows itself, so ESPN's order is not relied on.
- **Team stats come with team detail** (`teams/{id}?enable=roster,stats`): the overall record's stats carry goals, power play and penalty kill. The separate `teams/{id}/statistics` and `teams/{id}/roster` endpoints are not used.
- **The team schedule is asked for with `seasontype=2`**, the regular season; `1` is the preseason and `3` the playoffs, which nothing asks for yet. It is 1.1 MB for 84 games.
- **Playwright reuses a dev server that is already running** outside CI. One started without `ESPN_FIXTURES=1` gives the smoke tests live ESPN; stop it first.
- **`pkill -f "[v]ite dev"` does not match the dev server** `pnpm dev` leaves listening (its process is `node`), and it would match other worktrees' servers if it did. Stop yours by port: `kill $(ss -ltnp | grep ':5234' | grep -o 'pid=[0-9]*' | cut -d= -f2)`.
- **A name exported from two files of `packages/schemas` fails typecheck at the index** (`export *` twice). `SeasonRecord` is the picks' record; a team's is `TeamRecord`.

## The skeleton is scaffolding

`SkeletonAgent`, `skeleton_bumps`, `takeSkeletonReading`, `bumpSkeleton` and the page that shows them exist to prove the joins. Replace them with the real thing as tickets land; `skeleton_bumps` goes by a migration that drops it. `bumpSkeleton` (a browser making an Agent write) is not a pattern to copy: browsers are read-only. The join page lives at `/skeleton` since #38.

## The look: `packages/ui` and the shell (#38)

- **`/skeleton/ledger` is the living sample**: every `packages/ui` primitive on one page, laid out as the Reference UI's dashboard. Copy from `apps/web/app/skeleton/ledger/page.tsx`. It is scaffolding too, and goes when the real pages exist.
- **Every table is a `Ledger`** (`@yogan-hockey/ui/components/ledger`): `Ledger` > `LedgerHead` > `LedgerColumn`, then `LedgerBody` > `LedgerRow` > `LedgerCell`. `numeric` right-aligns a column or cell; `tone` is `strong`, `score`, `note` or `aside`; `LedgerRow live` tints a game in progress; `Ledger density="compact"` is for long tables such as standings. `LedgerAside` is the quiet text beside a value (a record), `LedgerDetail` a second line under it. None of it is a client component.
- **A row that links somewhere**: set `interactive` on the `LedgerRow` and put the `ledgerRowLink` class string on the `next/link` in its first cell. The link stretches over the row, so the row stays a real table row.
- **A page returns `Section`s in a fragment.** The shell's `<main>` pads the page and spaces its direct children by 32px; a page adds no wrapper, padding or max width of its own. Two ledgers side by side: `<div className="grid gap-8 xl:grid-cols-2">`.
- **Tabs held in the URL** are `UrlTabs` with `link={Link}`: the page reads `searchParams`, passes `current`, and each tab is a link. No client component, no Base UI Tabs.
- **Tokens** live in `packages/ui/src/theme.css`. Beyond shadcn's: `border-border` is the rule under a row, `border-rule` the heavier rule framing the shell, `text-live` and `bg-live-tint` a game in progress, `bg-highlight` the row under the pointer. Secondary text is the foreground at an opacity, never a grey: `text-foreground/70` a note, `/60` an idle link or a second line, `/50` a column header or a count, `/40` an aside. Body text is 13px Geist Mono, set on `<body>`; the only other sizes are 10px (column headers, footer, badges), 14px (wordmark) and 16px (scores). `--radius` is 0: nothing is rounded.
- **Glyphs Geist Mono lacks come from a fallback font and change size between machines.** "●" is why `LiveMarker` draws its dot in CSS. Use words, or draw the shape.
- **The Reference UI draws the live status link black**, not red: its `a { color: inherit }` beats the `text-red-600` in its source. The sample follows what is drawn (`<LiveMarker strong className="text-foreground underline">`); "● live" beside a favorite player is red in both.
- **`next-themes` works under vinext without a flash**: its inline script is in the server's HTML and sets the class on `<html>` before first paint. `<html>` needs `suppressHydrationWarning`. Anything that differs by theme is rendered both ways and shown with `dark:` classes (see `theme-toggle.tsx`), since the server does not know the theme.
- **The score ticker (#41) goes in `apps/web/components/shell/score-ticker-slot.tsx`**: fill that component. It is the first thing in the content column on every page and hides itself while empty.
- **A new nav destination, or a route that moves**, means `apps/web/lib/nav.ts`, whose `owns` decides which sidebar item is marked on which path.
- **A Playwright click straight after `goto` can land before hydration** and do nothing. Wrap the click and its assertion in `expect(async () => { ... }).toPass()` (see `e2e/shell.spec.ts`).
- **Playwright runs one test at a time** (`workers: 1`). The tests share one dev server, one D1 and one Agent, and two browsers at once lose clicks and state to each other.
- **One hard navigation per test on a cold dev server.** A second `page.goto` made while the first page's modules are still loading fails with "Failed to fetch dynamically imported module" and can crash the page. Navigate by clicking links, or `reload`.
- **`e2e/skeleton.spec.ts` fails when a reading older than 60 seconds is left in the local KV** from an earlier run: the stale entry is served once, then replaced, so the reload shows a new serial. Run it twice, or delete `apps/web/.cloudflare/state`. CI starts clean and is unaffected.
- **React logs "Encountered a script tag while rendering React component"** in dev when `next-themes` re-renders on the client. Harmless: the script already ran from the server's HTML.
- **Comparison screenshots**: `node scripts/screenshot.mjs <url> <out.png> <width> [light|dark] [height] [--menu]`, with the Reference UI on port 4517 (`pnpm dev --port 4517` in the `prototype/look-and-feel` worktree; `/prototype/dashboard?variant=C`) and your own dev server on your `PORT`. To compare by eye, stack two crops: `magick a.png -crop 720x280+0+0 +repage a-crop.png`, then `magick a-crop.png b-crop.png -append cmp.png`. Measuring beats looking: `getBoundingClientRect()` on the same selectors in both pages showed the shell matching to a tenth of a pixel. Saved shots go in `docs/design/<subject>/`.
