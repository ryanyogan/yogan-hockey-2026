# One Worker with no API, two Agents, and three stores with one job each

The site and its backend are a single Worker. There is no REST API: server components and Server Actions read data by calling the Agents directly or by fetching ESPN through one shared module. Only what is polled on a schedule and pushed to viewers gets an Agent, which means the Scoreboard (one instance) and the Game (one per NHL game). Both poll only while someone is watching.

Data lives in three places, each with one job: Workers KV is the disposable cache of ESPN data behind vinext's data cache; an Agent's own storage is its working state while live; D1 is the permanent record of finished games and their plays, which is what replay reads.

When a game goes final, the Scoreboard Agent invalidates the cached standings, both teams and their players, so pages are fresh at the horn instead of after a timer.

## Considered Options

- **A separate API Worker**: would keep the backend out of vinext's pre-release build tooling, at the price of a second hostname, CORS, a second Access gate and a contract to version. With one language and one deploy there is nothing for it to protect.
- **An Agent for everything**, including standings and players: nobody needs those pushed, and ordinary cached fetching already covers them.
- **Finished games in each Game Agent's storage**: nothing outside an Agent can query it, so listing or searching games across dates and teams would be impossible.
- **Polling around the clock**, as the Parity Reference does: rejected by Ryan; the first visitor after a quiet spell triggers a catch-up instead.

## Consequences

- Every site deploy restarts the Agents. They resume from stored state.
- A game that ends with nobody on the site is noticed, and archived, on the next visit or the first time its replay is opened.
- Live updates use the Agent's synced state for small current values and separate messages for plays, because synced state is re-sent whole on every change.

Detail: [Backend shape on Cloudflare: Agents, Workers, and the live contract](https://github.com/ryanyogan/yogan-hockey-2026/issues/27).
