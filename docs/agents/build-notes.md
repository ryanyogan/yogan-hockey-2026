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

`SkeletonAgent`, `skeleton_bumps`, `takeSkeletonReading`, `bumpSkeleton` and the page that shows them exist to prove the joins. Replace them with the real thing as tickets land; `skeleton_bumps` goes by a migration that drops it. `bumpSkeleton` (a browser making an Agent write) is not a pattern to copy: browsers are read-only.
