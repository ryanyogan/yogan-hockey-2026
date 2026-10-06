---
status: superseded by ADR-0006 and ADR-0007 (server components and Server Actions carry over; everything else here is void)
---

# A separate API Worker fronts the Rust service; live updates are SSE with a snapshot on every connect

The container can only be reached through a Worker. We put a small API Worker on its own hostname in front of it, apart from the vinext site Worker, so the site's Worker never holds a long-lived connection and the container stays out of vinext's pre-release build tooling. Live updates use Server-Sent Events on two streams, a site-wide scoreboard stream and the per-game Game Stream, and every connection (including reconnects) begins with a full snapshot followed by changes.

The snapshot rule exists because a container restart leaves the service with no event history: there is no replay log and no `Last-Event-ID` handling, so reconnects, restarts and deploys all look the same to the browser.

## Consequences

- The JSON API is read-only REST under `/v1/` in the service's own shapes and ids, never ESPN's, and changes within `/v1` are additive only because the Workers and the container never deploy at the same instant.
- Server components fetch first paint and Server Actions handle on-demand fetches (favorites, search), so the browser's only direct connection to the API Worker is the two streams.
- TypeScript types are generated from the Rust service's OpenAPI document and committed.

Detail: [Contract between vinext and the Rust service](https://github.com/ryanyogan/yogan-hockey-2026/issues/12).
