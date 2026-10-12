# The site is TanStack Start with plain SSR, and pages arrive whole

The site was first built on vinext with React Server Components, as a trial. It took a lot of our own code to make it behave (a page cache in the Worker's entry, status fixes, a placeholder for every route), and it felt janky: outlines flashing on each navigation, today's games popping in after first paint, and titles streamed in late. The site moves to TanStack Start, rendered on the server and hydrated, with no server components. Each route's loader waits for everything its page draws, so a page arrives whole.

This replaces what ADR 0006 and ADR 0007 say about vinext, server components and Server Actions. Their backend decisions stand: one Worker, no separate API, two Agents, three stores with one job each.

## The rules

- **Loaders call server functions and nothing else.** A loader runs on the server for a first load and in the browser for a navigation, so anything that touches an Agent, KV, D1 or ESPN sits behind a server function, one for each page-level read. Components do not fetch. Resolving favorites and saving a pick are the two calls made outside a loader.
- **Nothing is deferred.** There are no placeholders for a route and no `<Suspense>` around data. A read that proves too slow may be deferred on its own later, with a measurement to show for it.
- **Nested routes keep what they have.** A team, a game and a player are each a parent route with its tabs beneath it: changing tab runs the tab's loader alone.
- **Loader data is fresh for five minutes, and the Scoreboard's socket ends that early.** When `invalidatedAt` moves, the router's loaders are run again. After first paint, today's games are the socket's alone.
- **Whole pages are not cached.** Every document is rendered for its request, with the Scoreboard in it.
- **ESPN reads are cached in KV with a time limit each, and a final deletes the keys of what it changed**: the standings, both teams and their players. Pages are still fresh at the horn.
- **The Cloudflare tooling stays `cf` and `cloudflare.config.ts`.** Cloudflare has named `cf` as Wrangler's successor, so the site does not move to `wrangler.jsonc`. The Agent classes are declared as `exports`, never in a `migrations` list.

## Considered Options

- **Server components in TanStack Start**: its own documentation calls them experimental and opt-in. That would be a second pre-release RSC implementation in place of the first, on a site whose interactive parts (the scoreboard, the rink, replay, search, favorites) are client components already.
- **Staying on vinext**: the code written around it was growing, and the placeholders that made it feel janky were what its streaming required.
- **Carrying the page cache across**: it is why a cached page left today's games out of its HTML, and half of it keyed RSC answers. A navigation now fetches a loader's data, not a page, so only a first load pays for a render. A cache of documents alone can be added if first loads miss their budget.
- **TanStack Query beside the router**: a second cache with nothing to do. The router keeps loader data, and what is live arrives on a socket.

## Consequences

- Every component is sent to the browser and the whole page hydrates, where server components sent only the interactive parts. The port is accepted when no route sends more script or hydrates later than it did before; `/nhl`, the heaviest, is measured first.
- The first byte waits for the slowest read. A page nobody has opened lately waits on ESPN before it shows anything, where it used to show its shell first.
- A first load is rendered every time, so its budget is the one for a rendered page, not for a cached one.
- A server function can be called by anyone who can reach the site, so each validates its input with the schemas in `packages/schemas`.
