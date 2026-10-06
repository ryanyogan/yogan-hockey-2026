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

## The skeleton is scaffolding

`SkeletonAgent`, `skeleton_bumps`, `takeSkeletonReading`, `bumpSkeleton` and the page that shows them exist to prove the joins. Replace them with the real thing as tickets land, and regenerate the migration before the first deploy. `bumpSkeleton` (a browser making an Agent write) is not a pattern to copy: browsers are read-only.
