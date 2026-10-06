# The backend is TypeScript on Cloudflare Agents, not a Rust service

The rebuild was first planned as a Rust service of in-memory actors on Cloudflare Containers. We dropped it for a TypeScript backend on the Agents SDK (Durable Objects): one Agent per live game polls ESPN on its own schedule, keeps the game's state in its own storage, and pushes changes to viewers over WebSocket. Rust bought nothing the workload needs, which is polling a few ESPN endpoints and diffing JSON, and it was the reason for a container, a keep-alive cron, a proxying API Worker, a Docker build, generated API types and a second toolchain.

## Considered Options

- **Rust on Cloudflare Containers** (the earlier plan, ADRs 0001 and 0004): about $6.74/month, with everything above, and all state lost on every restart.
- **Rust on Fly**: about $7.19/month for one machine alongside Workers Paid. Always on with no glue, but it keeps Docker, type generation and two toolchains, adds a second vendor, and closes idle connections after 60 seconds. Two machines would poll ESPN twice and need shared storage for predictions.
- **TypeScript on Cloudflare** (chosen): about $5/month, the Workers Paid plan alone, with Durable Object use inside its included allowance.

## Consequences

- The cost of this choice is the Rust and actor work itself, which was part of the point of the rebuild. The ractor prototype stays on the `prototype/game-actor` branch.
- Live updates are WebSocket, not SSE, and TypeScript types are shared by import, so most of ADR 0002 no longer holds.
- State survives restarts and deploys, so storing Claude predictions is no longer a special case.
- Two things were unverified when this was decided: that ESPN serves requests from Cloudflare's network, and that the Agents SDK's `useAgent` works under vinext. A prototype checks both before anything else is built on this.

Detail: [One Agent per live game feeding a vinext page](https://github.com/ryanyogan/yogan-hockey-2026/issues/26), [map](https://github.com/ryanyogan/yogan-hockey-2026/issues/1).
