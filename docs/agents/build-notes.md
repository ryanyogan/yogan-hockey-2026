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
- **ESPN's final score for a shootout already gives the winner the extra goal** (the summary header and the scoreboard both), so no finished game is tied. The running score on the plays does not include it.
- **ESPN has no "penalty" play type.** Each infraction is its own type ("High-sticking", "Hooking"), which is why `Play` carries a `penalty` flag for the translation in #35 to set.

## The skeleton is scaffolding

`SkeletonAgent`, `skeleton_bumps`, `takeSkeletonReading`, `bumpSkeleton` and the page that shows them exist to prove the joins. Replace them with the real thing as tickets land; `skeleton_bumps` goes by a migration that drops it. `bumpSkeleton` (a browser making an Agent write) is not a pattern to copy: browsers are read-only.
