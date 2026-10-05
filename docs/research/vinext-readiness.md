# vinext readiness for this site

Research for issue #6. Sources are the `cloudflare/vinext` repository at commit `f3505ce` (2026-10-05), its issue tracker, npm, Cloudflare's docs and shadcn/ui's docs, all read on 2026-10-05. Claims marked **[probe]** were also checked by running a throwaway app (not committed anywhere) on `vinext@1.0.1`; the setup is described under [Probe](#probe).

## Answer

**vinext is ready for this site.** Everything the seven Parity Reference routes and the Game Stream page need works today on `vinext@1.0.1`: App Router, server components, streaming with `<Suspense>`, dynamic routes, route handlers, client navigation, Tailwind v4, shadcn/ui, cached `fetch` against an external JSON API, and a browser `EventSource` held by a client component. A scratch build inside a pnpm workspace confirmed each of these.

Four things will bite if not known up front:

1. **shadcn/ui's Radix style hangs the production build under pnpm.** Use shadcn's default Base UI style, which builds fine. (vinext issue #3483, open, reproduced.)
2. **A page that calls plain `fetch()` with no cache options is cached for a year.** Every route that shows scores must set `revalidate` or `dynamic` explicitly. (Reproduced; this is Next.js semantics, but the site is all live data.)
3. **The default scaffold pins pre-release Cloudflare tooling:** the `cf` CLI at `1.0.0-beta.12` and `@cloudflare/vite-plugin` at a `2.0.0-beta` build.
4. **Without a cache adapter the cache lives in each Worker isolate's memory**, so it is neither shared nor durable. For this site that is acceptable, because the Rust service is the real cache.

**Game Stream connection:** the browser should open an `EventSource` straight to the Rust service from a client component, with the page's first paint coming from a server-component `fetch` of the current game state. The Worker stays out of the long-lived connection.

## Status of vinext today

- `vinext@1.0.0` was published 2026-09-28 and `1.0.1` on 2026-10-01; `latest` on npm is `1.0.1`. [releases] [npm-vinext]
- The repo is very active: the head commit is from today, with 269 open and 523 closed issues. [repo]
- The README still carries this warning: "vinext supports substantial Next.js applications today, but it is not yet a drop-in replacement for every application or production workload. Expect compatibility gaps, especially in newer App Router features". [readme]
- Cloudflare's own Next.js guide says "Cloudflare recommends vinext as the default way to run Next.js applications on Cloudflare Workers" and, on the same page, "vinext is in beta". The page appears not to have caught up with the 1.0 release. [cf-nextjs]
- It targets Next.js 16.x only, on Vite 8, and needs Node.js 22 or newer and React `^19.2.6`. [readme] [getting-started]
- The compatibility dashboard's run of 2026-10-05 against Next.js v16.2.6 reports App Router at 99.8% of supported tests passing and 94.6% overall, over 799 test files. [compat]

## What works

Each row is what the README's coverage tables state; **[probe]** marks what was also run.

| Need | Status | Evidence |
| --- | --- | --- |
| App Router pages, layouts, `loading`, `error`, `not-found` | Full | [readme] **[probe]** (pages, layout, 404) |
| Dynamic routes `[param]` (player detail, team) | Full | [readme] **[probe]** |
| Server components and `"use client"` boundaries | Full | [readme] **[probe]** |
| Streaming SSR with `<Suspense>` | Full | [readme] **[probe]**: shell arrived at 187 ms, the suspended table at 941 ms |
| Route handlers (`route.ts`) | Full | [readme] **[probe]** |
| `next/link` client navigation with prefetch | Full | [readme] **[probe]**: no document reload on click |
| Metadata API | Full, with an open bug (see gaps) | [readme] **[probe]** for static `metadata` |
| `fetch` with `next.revalidate` / `next.tags`, `revalidateTag`, `revalidatePath`, `unstable_cache`, `"use cache"` | Full | [readme] [caching] **[probe]** for `next.revalidate` |
| Server Actions, middleware / `proxy.ts` | Full | [readme] (not needed for parity; not probed) |
| Env vars: `.env*` files, `NEXT_PUBLIC_*` inlined | Full | [readme] |
| Cloudflare bindings via `import { env } from "cloudflare:workers"` | Full | [readme] [deploy-cf] |
| Dev server and production build both run server code in workerd | Yes | [readme] **[probe]** |

Build speed in the probe: about 15 seconds for a production build of five routes; first dev request about 4 seconds, later ones under 1 second.

## shadcn/ui and Tailwind v4

**Tailwind v4 works.** `create-vinext-app` generates a Tailwind v4 project wired through `postcss.config.mjs` with `@tailwindcss/postcss` and `@import "tailwindcss"` in `app/globals.css`. [scaffolder] **[probe]**: utilities and shadcn's CSS variables were present in the built stylesheet and applied in the browser.

- Keep the generated PostCSS setup. Other ways of configuring Tailwind have failed for people: a `turbopack` loader rule is ignored, and a JSON PostCSS config or string-form plugins in an existing app's config did not resolve. (Issues #1128 and #3240, both open.)
- Tailwind's Vite plugin (`@tailwindcss/vite`) is in vinext's own dependency catalog, so it is presumably usable, but it was not probed. [workspace]

**shadcn/ui works with its default Base UI style.**

- vinext lists `shadcn-ui`, `tailwindcss`, `lucide-react` and `@radix-ui/react-dialog` as supported in `vinext check`, and has a shadcn fixture in its ecosystem tests. That fixture imports the per-package `@radix-ui/react-*` modules, not the `radix-ui` barrel. [check] [fixture]
- shadcn's installation page lists Next.js and Vite, not vinext. [shadcn-install] In practice `shadcn@4.21.1 init` ran unmodified in the vinext scaffold: it reported "Found Next.js", "Found v4", wrote `components.json` with style `base-nova`, and generated components on `@base-ui/react`. **[probe]**
- Button, Card, Table, Skeleton and Dialog were rendered and built (Tabs and Dropdown Menu were generated but not rendered); a Dialog opened in a headless browser with no script errors; the `next/font/google` variable that shadcn adds to the layout was set. **[probe]**

**shadcn's Radix style does not build under pnpm.** The Radix-style components import from the `radix-ui` barrel, for example `import { Slot } from "radix-ui"` in `button.tsx`, with no `"use client"` directive. [shadcn-registry] vinext rewrites imports from that barrel, and under pnpm the rewrite never settles: `vite build` stalls at `[1/5] analyze client references`. This is issue #3483 (open); the fix is PR #3516 (open, not merged). **[probe]**: on `vinext@1.0.1` with `radix-ui@1.6.7` the build was still stuck after 150 seconds. Narrowing it down:

- the barrel imported from a server component: hangs;
- the barrel imported only from a `"use client"` file: builds;
- imports from `@radix-ui/react-slot` and `@radix-ui/react-dropdown-menu` directly: builds;
- dev mode is unaffected, so the problem appears only at build time.

## Data fetching and caching against the Rust API

The Rust service is an ordinary external origin to the Worker: server components and route handlers call it with `fetch`. **[probe]**

**How caching behaves** [caching] [differences], with **[probe]** results:

| Route code | Result |
| --- | --- |
| `fetch(url, { next: { revalidate: 30 } })` | Upstream hit once; page stored with `s-maxage=30`; later requests are `x-vinext-cache: HIT` in 8 ms |
| plain `fetch(url)`, no route config | Page stored with `s-maxage=31536000`; the upstream is not called again |
| `fetch(url, { cache: "no-store" })` | Rendered every request; `Cache-Control: private, no-cache, no-store` |
| `export const dynamic = "force-dynamic"` | Rendered every request |

The second row is the sharp edge. The docs state it: "A static page defaults to `revalidate = false`, as in Next.js" and such a page "is rendered again only after `revalidatePath()` or `revalidateTag()` invalidates it, or once the cache drops it". [caching] A standings or scores page written the obvious way would freeze. Every route should state its freshness: `revalidate = N` for standings, team, and player pages, and `dynamic = "force-dynamic"` or a few-second `revalidate` for live scores.

The build's route table cannot be trusted to warn about this. It marked all of these routes `? Unknown` and printed "vinext currently uses static analysis and cannot detect dynamic API usage ... at build time". **[probe]**

**Where the cache lives.** "The default `MemoryCacheHandler` works out of the box." [readme] On Workers that means per-isolate memory: not shared between isolates or locations, and gone when an isolate is evicted. The persistent options are [caching]:

- Workers Response Store (the documented recommendation): needs R2, a SQLite Durable Object, and either a second Worker or extra bindings;
- Workers Cache plus KV;
- KV only;
- Static Assets (immutable until the next deploy, so wrong for live data).

For this site, starting with no adapter is reasonable. The Rust service already holds current state in memory, so a cache miss costs one small JSON request. Short `revalidate` values then mostly serve to absorb bursts within one isolate.

**Worker limits that apply** [cf-limits]:

- CPU time per request is 10 ms on Workers Free and 30 seconds by default on Paid. Whether server-rendering these pages fits in 10 ms was not measured.
- Subrequests per request: 50 on Free, 10,000 on Paid. A dashboard page making a handful of API calls is far below either.
- Up to six outgoing connections can wait for response headers at once per invocation.

**Env vars.** `NEXT_PUBLIC_*` values are inlined into the client bundle at build time. [readme] Server-side values come from Worker vars and secrets at runtime, readable through `process.env` (with `nodejs_compat` and a compatibility date of 2025-04-01 or later, both of which the scaffold sets) or `import { env } from "cloudflare:workers"`. [cf-env] [scaffolder] So the browser-facing API URL is fixed per build, while the server-side one can differ per environment.

## Holding the Game Stream connection

**Recommended: browser to Rust service directly, over SSE.**

1. The game page is a server component that fetches the current game state from the Rust service with `cache: "no-store"` and renders it.
2. It renders a client component, passing that state as props.
3. The client component opens `new EventSource(...)` to the Rust service inside `useEffect` and closes it in the cleanup function.

This is the pattern in vinext's own SSE test fixture, and it worked in the probe after a client-side navigation: the component received all five events from the stand-in backend. [sse-fixture] **[probe]**

Why this shape:

- **Nothing in vinext is involved in the long-lived connection.** It is browser code talking to another origin, so vinext's maturity does not matter for it.
- **SSE fits a one-way stream** and `EventSource` reconnects by itself, sending `Last-Event-ID` so the Rust service can resume. That matters because the hosting research (issue #2) found Railway closes an HTTP stream after 15 minutes even with heartbeats.
- **No Worker invocation is held open per viewer.**

What it requires of the Rust service: a public HTTPS URL, CORS headers allowing the site's origin, event `id:` fields, and periodic heartbeat comments. The URL reaches the client as a `NEXT_PUBLIC_*` variable or as a prop from the server component.

**Alternative: proxy the stream through a route handler** (`app/api/.../route.ts` returning the upstream `fetch` body with `Content-Type: text/event-stream`). This also worked: events arrived one at a time, 400 ms apart, not buffered. **[probe]** It keeps the browser same-origin, so no CORS and the backend URL stays private. Cloudflare documents "no hard limit on duration for HTTP-triggered Workers. As long as the client remains connected, the Worker can continue processing ... and streaming a response body". [cf-limits] The costs are one open Worker invocation per viewer and an extra hop. It was only tested in local workerd, not on deployed Workers.

**WebSocket** is only worth it if the page must send messages to the backend. The browser-direct version is equally independent of vinext. Proxying one through the Worker is possible on the platform (`WebSocketPair`, outbound `fetch` with `Upgrade: websocket`) [cf-ws], and vinext's source has code paths that tolerate a Worker WebSocket upgrade response [ws-source], but returning an upgrade from a vinext route handler was not tested and nothing in the docs describes it.

**Do not** open the stream in a server component or hold it across requests in the Worker; a Worker has no life outside a request.

## pnpm monorepo setup

Running `pnpm dlx create-vinext-app@latest web --use-pnpm --yes --platform=cloudflare` inside `apps/` of an existing pnpm workspace worked. **[probe]**

- It joined the workspace: one lockfile at the root, dependencies linked into `apps/web/node_modules`.
- **pnpm blocks `workerd`'s install script.** The scaffolder printed "Dependency installation is waiting for build-script approval" and still reported success. `pnpm approve-builds workerd esbuild` at the root fixed it and wrote `allowBuilds` into the root `pnpm-workspace.yaml`. Issue #3198 (open) describes a worse outcome of the same step on pnpm 12.0.0, where `package.json` and the lockfile disagreed; on pnpm 12.8.1 they stayed consistent.
- Generated scripts are `vite dev`, `vite build`, `vite preview` and `vinext-cloudflare deploy`, so `pnpm --filter web <script>` works from the root.
- The app needs `"type": "module"`; the scaffolder sets it.
- `tsconfig.json` path aliases (`@/*`) resolve without extra config. [readme] **[probe]**
- vinext's own repository is a pnpm workspace whose examples depend on `vinext` with `workspace:*`, and its project utilities walk up to the workspace root for lockfiles and hoisted packages. [workspace] [project-utils]

The Rust service does not interact with any of this; it only shares the repository.

Not tested: a shared `packages/ui` workspace package consumed by the app, and shadcn's `init --monorepo` template (which generates Turborepo with Next.js, Vite, and others, not vinext [shadcn-monorepo]). Running plain `shadcn init` inside `apps/web` is the path that is known to work.

## Gaps and sharp edges that matter here

Ordered by how likely this site is to hit them.

1. **shadcn Radix style hangs the build under pnpm** (#3483, fix in open PR #3516). Use the Base UI style, or import `@radix-ui/react-*` packages directly.
2. **Unannotated pages are cached indefinitely.** See the caching table. Set `revalidate` or `dynamic` on every route.
3. **Pre-release Cloudflare toolchain by default.** The scaffold generates `cloudflare.config.ts` and depends on `cf@1.0.0-beta.12` (npm's only `cf` release line) and `@cloudflare/vite-plugin@2.0.0-beta.sha-52b0dc0e9`, while that plugin's `latest` is `1.62.5`. [npm-cf] **[probe]** `--legacy-wrangler-cloudflare-init` keeps the Wrangler setup instead. [readme]
4. **Fonts and images are not optimized at build time.** `next/font/google` loads from Google's CDN at runtime with no self-hosting or fallback metrics; `next/image` does no build-time resizing, and request-time optimization needs the Cloudflare Images binding. [readme] Team logos and headshots served from a remote CDN are unaffected beyond that.
5. **Metadata can land in `<body>`.** Issue #1492 (open) has a report on 1.0.0 of the whole `generateMetadata` block, including Open Graph tags, rendered in the body, which breaks link previews. Issue #2007 (open) is the same for async `generateMetadata`. Static `metadata` was correctly in `<head>` in the probe; async `generateMetadata`, which player pages would use, was not probed.
6. **Open tabs break across deploys for Server Actions** (#3604, open): a tab opened before a deploy fails its first action until reloaded. Only relevant if the site adds Server Actions.
7. **A streamed `<Suspense>` duplicate-DOM bug is reported** (#3328, open, since beta.9). It did not reproduce in the probe on 1.0.1, and the reporter could no longer trigger it after changing their code.
8. **Differences in static/dynamic classification from Next.js.** A `"use client"` page reading `searchParams`, or `useSearchParams()` without a `<Suspense>` above it, can be cached where Next.js would treat the route as dynamic. This matters for player search. The documented fix is to read `searchParams` in a server component page, or set `dynamic = "force-dynamic"` in the layout, and wrap `useSearchParams()` in `<Suspense>`. [differences]
9. **Not implemented or incomplete, and not needed here:** Cache Components / Partial Prerendering, `preferredRegion`, native Node modules in dev, domain-based i18n. [readme]

Things that are not vinext APIs and should not be reached for: webpack or Turbopack config (use Vite plugins), `next/jest` (use Vitest), Vercel-specific services. [readme]

## Probe

A throwaway app in a temporary scratch directory; nothing from it is in this repository.

- **Versions:** Node 26.10.0, pnpm 12.8.1, `vinext@1.0.1`, `@vinext/cloudflare@1.0.1`, `vite@8.3.0`, `@vitejs/plugin-rsc@0.5.35`, `@cloudflare/vite-plugin@2.0.0-beta.sha-52b0dc0e9`, `cf@1.0.0-beta.12`, `shadcn@4.21.1`, `@base-ui/react@1.8.0`, `radix-ui@1.6.7`.
- **Shape:** a pnpm workspace with the scaffold at `apps/web`, no cache adapter, and a small Node HTTP server standing in for the Rust service (a JSON endpoint that counts its hits, and an SSE endpoint sending five events 400 ms apart, with permissive CORS).
- **Run:** `vite build`, then `vite preview` (which serves the built Worker in local workerd), checked with `curl`, a streaming `fetch` reader, and headless Chromium through `playwright-core`. `vite dev` was checked for a 200 response only.

## Not verified

- **Nothing was deployed to Cloudflare.** All runtime results are from local workerd. `vinext-cloudflare deploy --dry-run` passed, but a real `cf` deploy, CPU time per render, cold-start time, and behaviour of the in-memory cache across real isolates are unmeasured.
- Whether rendering fits Workers Free's 10 ms CPU limit.
- SSE proxied through a deployed Worker for a long session, and any WebSocket path through vinext.
- A shared workspace UI package, and shadcn's `--monorepo` template.
- Async `generateMetadata` placement (#1492, #2007) on 1.0.1.
- Persistent cache adapters (Response Store, KV, Workers Cache): read about, not run.
- HMR quality over a real editing session.

## Sources

- [readme] https://github.com/cloudflare/vinext/blob/f3505ce2681ab607766e3c66bcdd4e8a1ea000ea/README.md
- [repo] https://github.com/cloudflare/vinext (commit `f3505ce`, issue counts from the GitHub search API)
- [releases] https://github.com/cloudflare/vinext/releases
- [npm-vinext] https://www.npmjs.com/package/vinext
- [npm-cf] https://www.npmjs.com/package/cf and https://www.npmjs.com/package/@cloudflare/vite-plugin
- [getting-started] https://github.com/cloudflare/vinext/blob/f3505ce2681ab607766e3c66bcdd4e8a1ea000ea/docs/getting-started/index.mdx
- [deploy-cf] https://github.com/cloudflare/vinext/blob/f3505ce2681ab607766e3c66bcdd4e8a1ea000ea/docs/deploying/cloudflare.mdx
- [caching] https://github.com/cloudflare/vinext/blob/f3505ce2681ab607766e3c66bcdd4e8a1ea000ea/docs/caching.mdx
- [differences] https://github.com/cloudflare/vinext/blob/f3505ce2681ab607766e3c66bcdd4e8a1ea000ea/docs/reference/differences.mdx
- [compat] https://vinext.dev/compatibility
- [scaffolder] https://github.com/cloudflare/vinext/blob/f3505ce2681ab607766e3c66bcdd4e8a1ea000ea/packages/create-vinext-app/src/index.ts
- [check] https://github.com/cloudflare/vinext/blob/f3505ce2681ab607766e3c66bcdd4e8a1ea000ea/packages/vinext/src/check.ts
- [fixture] https://github.com/cloudflare/vinext/tree/f3505ce2681ab607766e3c66bcdd4e8a1ea000ea/tests/fixtures/ecosystem/shadcn
- [sse-fixture] https://github.com/cloudflare/vinext/blob/f3505ce2681ab607766e3c66bcdd4e8a1ea000ea/tests/fixtures/app-basic/app/sse-test/sse-client.tsx
- [ws-source] https://github.com/cloudflare/vinext/blob/f3505ce2681ab607766e3c66bcdd4e8a1ea000ea/packages/vinext/src/server/static-file-signal.ts
- [workspace] https://github.com/cloudflare/vinext/blob/f3505ce2681ab607766e3c66bcdd4e8a1ea000ea/pnpm-workspace.yaml
- [project-utils] https://github.com/cloudflare/vinext/blob/f3505ce2681ab607766e3c66bcdd4e8a1ea000ea/packages/vinext/src/utils/project.ts
- vinext issues: [#3483](https://github.com/cloudflare/vinext/issues/3483), [PR #3516](https://github.com/cloudflare/vinext/pull/3516), [#1128](https://github.com/cloudflare/vinext/issues/1128), [#3240](https://github.com/cloudflare/vinext/issues/3240), [#3198](https://github.com/cloudflare/vinext/issues/3198), [#1492](https://github.com/cloudflare/vinext/issues/1492), [#2007](https://github.com/cloudflare/vinext/issues/2007), [#3604](https://github.com/cloudflare/vinext/issues/3604), [#3328](https://github.com/cloudflare/vinext/issues/3328)
- [cf-nextjs] https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- [cf-limits] https://developers.cloudflare.com/workers/platform/limits/
- [cf-ws] https://developers.cloudflare.com/workers/runtime-apis/websockets/
- [cf-env] https://developers.cloudflare.com/workers/configuration/environment-variables/
- [shadcn-install] https://ui.shadcn.com/docs/installation
- [shadcn-monorepo] https://ui.shadcn.com/docs/monorepo
- [shadcn-registry] https://ui.shadcn.com/r/styles/new-york-v4/button.json
