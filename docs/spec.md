# Yogan Hockey 2026: build spec

The whole design, as decided on the [map](https://github.com/ryanyogan/yogan-hockey-2026/issues/1). It is written in the present tense: it describes the site as it will be when built. Vocabulary is from `GLOSSARY.md`; the reasons behind the larger choices are in `docs/adr/`. Where a detail here and a closed ticket disagree, this document wins, because it leaves out what was later superseded.

Things nobody has run yet are marked **(unverified)** and collected in [Unverified](#unverified), each with the build issue that proves it.

## 1. What the site is

A family hockey dashboard at `hockey.yogan.dev`: live NHL scores, standings, teams and players from ESPN, a page per NHL game that shows the Game Stream while it is live and a Replay once it is final, a Prediction for every game, and a page for Rylan Yogan, the one Tracked Player.

It replaces the Parity Reference (`ryanyogan/yogan_hockey`, at `yogan-hockey.fly.dev`). The floor is what the Parity Reference's code does, not what its README says.

There are no accounts. Favorites live in the visitor's browser.

## 2. Architecture

One Cloudflare Worker holds everything (ADR 0006, ADR 0007).

- **The vinext site**: App Router, server components, Server Actions. There is no REST API.
- **Two Agents** (Agents SDK, SQLite Durable Objects) in the same Worker: the **Scoreboard** (one instance) and the **Game** (one per NHL game, named by ESPN's event id).
- **A small Worker entry** sends `/agents/*` to `routeAgentRequest` and everything else to `vinext/server/fetch-handler`.

Data comes from ESPN's unauthenticated site API and nowhere else (ADR 0003). One module, `packages/espn`, fetches it, parses every response through Zod, and translates it into the site's own shapes. Nothing outside that package sees an ESPN shape.

### Stores

| Store | Job | Lifetime |
| --- | --- | --- |
| Workers KV | Cache of ESPN data, behind vinext's data cache (`kvDataAdapter` from `@vinext/cloudflare`), tagged per standings, team, player and game | Disposable |
| Agent storage | Each Agent's working state while live, its schedule, and its alert state | Working state |
| D1 | Finished games, their plays, and Predictions | Permanent |

### How pages get data

- Server components read cached ESPN data through `packages/espn`, call an Agent over Durable Object RPC (`getAgentByName`) for first paint of live data, or query D1 through `packages/db`.
- An RPC result is copied to a plain object before it is passed to a client component.
- Server Actions handle on-demand reads from the browser: player search and resolving favorites.
- Client components hold the sockets with `useAgent`. Browsers are read-only: they can never write an Agent's state.
- The `@callable` decorator is not used.

### Rendering and caching

- Every page is rendered per request (`dynamic = "force-dynamic"`) and reads through the tagged KV cache. There is no page-level caching. `/family/rylan` is the one static page.
- Every cached read sets its own time limit. Nothing relies on vinext's default, which caches for a year.

| Data | Time limit | Tag |
| --- | --- | --- |
| Standings | 5 minutes | `standings` |
| Team page (record, roster, team stats) | 1 hour | `team:{id}` |
| Team schedule | 1 hour | `team:{id}` |
| Player page and career stats | 6 hours | `player:{id}` |
| Team list | 24 hours | `teams` |
| Player search results | 10 minutes | none |

## 3. Routes

| Route | Holds |
| --- | --- |
| `/` | The dashboard ledger: tonight's games, Rylan, favorites, standings |
| `/nhl` | Standings and Teams tabs |
| `/nhl/live` | In Progress, Upcoming and Final sections |
| `/nhl/games/:id` | Scheduled: matchup and the pick. Live: the Game Stream. Final: the Replay |
| `/nhl/teams/:id` | Team header, Schedule / Roster / Stats tabs |
| `/players` | Player search and favorite players |
| `/players/:id` | Season stats and career table |
| `/family/rylan` | Rylan's page |
| `/yogan` | Redirects to `/family/rylan` |

Site-wide:

- Sidebar navigation, in the Parity Reference's order: Standings, Teams, Players, Family, Live Scores. The wordmark links to `/`. Below the `md` breakpoint the sidebar becomes a menu opened from the top bar, which closes on navigation.
- A light/dark toggle that follows the operating system until the visitor chooses. Both themes exist for every page.
- Page titles name the page, team or player.
- An unknown path, team or player gets a not-found page inside the normal layout.
- The footer credits ESPN as the data source.
- A score ticker on every page.
- Scores update on every page without a refresh, through the Scoreboard socket.
- Every game card or game row, wherever it appears, links to that game's page.
- Tabs and standings views are held in the URL, so they survive a reload and can be linked.

### `/` Dashboard

Variant C, the "Tonight ledger": monospace type, one dense table per subject, no cards, no team logos.

- **Tonight's games**, with the live count in its header. Live rows are tinted. A note column carries the pick ("TOR 58%", or "pick pending") and a marker for a favorite team. Favorite teams' games sort first.
- **Family**: one row block for Rylan with his season totals, linking to `/family/rylan`.
- **Favorites**: up to four favorite players, each with a "live now" marker when his team is playing.
- **Standings**: a compact standings table linking to `/nhl`.
- **Season record of the picks**, in the header line of the Tonight's games table: "Picks: 34 right, 21 wrong".

Dropped from the Parity Reference: Quick Links, the NHL Teams grid, the standalone live/total game counter.

### `/nhl`

- **Standings** tab with four views held in the URL: Division, Conference, Wild Card, League.
- **Teams** tab: every team, linking to its page.

### `/nhl/live`

In Progress, Upcoming and Final sections, with an "updated" timestamp. Final games link to their Replay.

### `/nhl/teams/:id`

- Header with the team's record.
- Tabs held in the URL: Schedule, Roster, Stats. Finished games on the schedule link to their Replay; this season only.
- Hearts on the roster to favorite a player, and one on the header to favorite the team.
- A banner linking to the game page when the team is playing now, and a Next Game card linking to the scheduled game's page.
- Toronto's roster has Rylan Yogan, #99, at the top (see [Rylan](#7-rylan)).

### `/players` and `/players/:id`

- Search starts at two characters and runs through a Server Action. The page reads `searchParams` in a server component.
- The visitor's favorite players are listed.
- A player page shows season stats and the career table.
- A recent-games log is added only if ESPN's athlete game log parses cleanly from one extra request **(unverified)**; otherwise it is left out.

### `/nhl/games/:id`

See [Game pages](#5-game-pages). NHL games only.

## 4. The Agents

Both Agents poll only while someone is watching. A viewer is an open socket. Polling starts on the first connection and stops when the last one leaves. A timer that fires once is allowed with nobody watching; a loop is not.

Every site deploy restarts the Agents. They resume from stored state.

### Scoreboard

One instance. Every page connects to it.

- **Synced state**: today's games (teams, score, period, clock, status, start time).
- **Cadence**: every 30 seconds while a game is live or within 15 minutes of a scheduled start; every 5 minutes otherwise.
- **A visitor arriving while it is asleep**: if its stored state is older than one polling interval, it fetches from ESPN before answering, so first paint is current.
- **Game state** is read from ESPN's `status.type.state` (`pre`, `in`, `post`) and `status.type.completed`, never from the status name.

When it sees a game go final:

1. Writes the game row to D1 (teams, date, final score).
2. Invalidates the cache tags for standings, both teams, the players on both rosters, and the game. It does this directly **(unverified)**; the fallback is a small internal route in the same Worker.
3. Tells open pages, which re-render.
4. Sets two one-off timers: at 5 minutes, a second invalidation of standings and both teams; at 24 hours, a re-read of the game's plays into D1 if they were archived.

When it sees a game on today's slate for the first time, it starts that game's Prediction in the background (see [Predictions](#6-predictions)).

**Catch-up.** On the first visit after a gap it fetches the scoreboard for each missed date, writes the game rows to D1, and invalidates standings and the teams that played. It walks back up to 30 days per visit, oldest first, and continues on later polls if the gap is longer.

### Game

One per NHL game. Only a game page connects to it.

- **Synced state**: the header only (score, shots, period, clock, status, and a `delayed` flag).
- **Plays** are separate messages. On connect a viewer receives every play so far; after that, one message per new, changed or removed play.
- **Cadence**: every 10 seconds while play is in progress; every 30 seconds in an intermission. Each poll fetches ESPN's whole-game summary (about 40 KB gzipped) and diffs it against stored plays.
- **Diffing**: plays are matched by ESPN's play `id` and ordered by their position in ESPN's list, not by `sequenceNumber`. A changed play is an update. A play missing from the new list is a removal.
- **Revisions** update silently. The score always follows ESPN, so an overturned goal lowers it. There is no "goal overturned" marker.
- **Stall**: after three failed polls in a row, `delayed` is set and the page shows "updates delayed" over the last state. It clears on the next good poll. A quiet stretch of successful polls is not a stall.
- **At the final**: one last poll, the game row and every play are written to D1, viewers are told the game is over, and the schedule is cancelled.

### Alerts

Each Agent alerts on what it sees while in use:

- three failed ESPN polls in a row, or
- one response that fails to parse.

One ntfy push when a problem starts and one when it clears. The started/cleared state is in the Agent's own storage. The channel is the public `ntfy.sh` on a long random topic held as a Worker secret.

Nothing watches the site while nobody is on it. The daily GitHub check (see [Testing](#10-testing)) is the early warning for ESPN changing shape.

## 5. Game pages

One page, `/nhl/games/:id`, in three states. It moves between them without a reload.

Variant C, "Rink as the page": the rink fills the width, with the score, shots and clock laid over it and the latest play captioned on the ice. Beneath it is a horizontal period timeline. Below that are tabs: Plays, Scoring, The pick.

### Scheduled

The matchup and the full Prediction. When the Scoreboard reports the game live, the page switches to the Game Stream on its own.

### Live: the Game Stream

- The page opens on **key plays** (goals, penalties, shots on goal, period starts and ends). A toggle shows every play.
- Timeline ticks are taller for goals and carry a distinct mark for penalties. Clicking a tick or a play highlights it on the rink.
- Plays with a coordinate are drawn on the rink. ESPN gives coordinates in feet from centre ice on about 93% of plays. How they map onto the drawing, including which end each team attacks in each period, is **(unverified)**.
- Through an intermission the stream stays connected and shows the period break.
- "Updates delayed" appears when the Game Agent reports a stall.

### Final: the Replay

- Opens for browsing: the whole game is laid out, with the same rink, timeline, key-plays toggle and tabs.
- A play button steps through the plays in order at a fixed pace, with pause and a speed control. It does not follow the game's real gaps.
- The pick stays on the page, marked right or wrong.
- Replay reads only from D1. If the game's plays are not there yet (nobody watched it live), opening the Replay fetches them from ESPN once and writes them, and sets the same 24-hour re-read.
- Reach: this season. Older games are not linked.

## 6. Predictions

A Prediction is the site's pick for an NHL game: made once before it starts, never changed. On the site it is "the pick", with the line "generated by AI, for fun" on the game page.

- **Trigger**: the first time the Scoreboard sees a game on today's slate. Generated in the background; cards show "pick pending" until it arrives. A day with no visitors produces none.
- **Model**: Workers AI `@cf/openai/gpt-oss-120b` through the Worker's AI binding, routed through AI Gateway for its log of prompts and responses **(unverified)**.
- **Inputs**, all from ESPN's summary for the scheduled game: both teams' records and standings position, last five games, the season series, goalies, injuries, team leaders, home or away. Betting lines are excluded and never shown.
- **Output**, validated by the schema in `packages/schemas`: the picked team, that team's win probability as a percentage, two or three sentences of reasoning, and up to three key factors.
- **Failure**: one retry on invalid output, then `@cf/meta/llama-3.3-70b-instruct-fp8-fast` once. If that fails the game has no Prediction, nothing is shown, and it is not tried again. A computed substitute is never shown as a Prediction.
- **Cap**: one Prediction per game and at most 40 model calls a day, enforced in our own code.

Where it appears:

- Scheduled game cards and ledger rows: the one-line form, "TOR 58%".
- The scheduled game page: all of it.
- The Replay: the pick, marked right or wrong.
- The dashboard: the season record.

Right or wrong is worked out from the final score in D1. A game decided in overtime or a shootout counts like any other: the pick is for the winner. Games with a failed or missing Prediction are not counted.

## 7. Rylan

Rylan is a youth player, and the site is public (ADR 0005).

- He is "Rylan Yogan" everywhere. His legal surname is never rendered and does not appear in this repo's code or data.
- `/family/rylan` is built from a static file in the site: header, current season, career table, a team card naming his club ("Chicago Falcons", with no age group or level), and Stats and Schedule tabs filled with invented, over-the-top numbers and invented game rows. A small line reads "stats may be slightly exaggerated".
- Nothing is fetched from his league. His real schedule and opponents are never shown.
- The file's shape is a general Tracked Player (profile, current season, game log, career, team, each optional), so another family member is data, not code.

**The easter egg.** A fictional Rylan Yogan, #99, sits at the top of the Toronto Maple Leafs roster, turns up in player search, and has his own player page. His birth date is invented and he has no photo. He and the Tracked Player are presented as one person: `/family/rylan` links to the legend as his "career projection".

## 8. Favorites

- Browser-only, in `localStorage`. No accounts.
- Players and teams can both be favorited.
- Favorite teams' games sort first and are highlighted wherever games are listed.
- The dashboard shows up to four favorite players, each with a "live now" marker when his team is playing.
- Favorite players are listed on `/players`.

## 9. Repo, tooling and deploy

```
apps/web            routes, the Worker entry, and the two Agents
packages/ui         shadcn components (Base UI style) and the Tailwind theme
packages/schemas    the site's own shapes as Zod schemas with inferred types
packages/espn       ESPN client, translation into our shapes, recorded fixtures
packages/db         Drizzle schema for D1, migrations, query helpers
```

- One pnpm workspace, no Turborepo. Packages are consumed as TypeScript source with no build step.
- A root `mise.toml` pins Node and pnpm. Biome lints and formats.
- shadcn uses the Base UI style. The Radix style hangs the build under pnpm.
- Cloudflare config is `cloudflare.config.ts`, driven by the `cf` CLI. There is no Wrangler config.
- The prototypes on the `prototype/*` branches are throwaway. Nothing is promoted from them.

**Local development.** `pnpm dev` runs the vinext dev server with KV, D1 and the Agents simulated locally **(unverified)**. One environment variable switches `packages/espn` to fixture mode, where it reads its recorded responses. Fixture mode is used for offline work and by Playwright.

**D1.** Three tables: `games` (one row per finished game), `plays` (one row per play, keyed by game and ESPN play id), `predictions` (one row per game, keyed by game id, so a second Prediction for the same game is impossible). A prediction row holds the pick, when it was made, the model that made it, a compact copy of what the model was given, and a status of made or failed. Migrations are generated by Drizzle and additive only. Predictions are kept indefinitely.

**CI**, on every pull request: Biome, typecheck, Vitest, Playwright, a production build. `main` requires a pull request with green CI and no required reviewer. Each pull request gets a preview deploy with its own KV and D1 **(unverified)**.

**Deploy**, on a merge to `main`: apply D1 migrations, then deploy the Worker with `cf`. There is no staging and no guard against deploying during a live game; viewers reconnect and receive the plays again.

**Rollback**: the Worker's previous version through `cf`. The database only moves forward.

**Secrets.** GitHub Actions holds a scoped Cloudflare API token and the account id. The Worker holds the ntfy topic. Local development uses a gitignored env file.

**Plan.** Workers Paid, about $5 a month. A page render is at the Workers Free CPU limit already.

**Observability.** Workers logs, traces and Issues are enabled in the Worker's config. There is no error tracking service, no cron trigger and no uptime monitor.

## 10. Testing

No coverage target. Most of the effort goes on the Agents.

- **`packages/espn`**: Vitest on committed fixtures, with snapshots of the translated shapes. `pnpm record:fixtures` refetches a fixed list of endpoints and is rerun by hand.
- **Agents**: Vitest inside the Workers runtime (`@cloudflare/vitest-pool-workers`), with ESPN replaced by fixtures. Cases: polling starts and stops with viewers; new, changed and removed plays; a stall; a final triggering the cache invalidation and the D1 writes; catch-up after a quiet spell.
- **Site**: one Playwright smoke test per route, against `pnpm dev` in fixture mode.
- **Daily live check**: a scheduled GitHub Actions run fetches live ESPN and runs the parsers. On failure it opens or updates an issue labelled `needs-triage` naming the endpoint and the parse error, and sends an ntfy push.
- **Parity**: a checklist issue, one line per carried-over behaviour. Ryan ticks it by eye with both sites side by side.

## 11. Launch and cutover

- Until parity, Cloudflare Access sits in front of `hockey.yogan.dev`, pages and sockets, allowing only Ryan's email.
- Ryan calls parity from the checklist. Removing Access is the launch.
- Then one last Fly release turns the Parity Reference into a redirect: `/`, `/nhl`, `/nhl/live`, `/nhl/teams/:id`, `/players` and `/players/:id` keep their path on `hockey.yogan.dev`, `/yogan` goes to `/family/rylan`, and anything else goes to the home page.
- The redirect stays for the rest of the 2026-27 season. Then the Fly app is destroyed.

## Unverified

Each line is something the design assumes and nobody has run. The build issue named is where it gets proved; if it fails there, the fallback applies and this spec is corrected.

| # | Assumption | Fallback if it fails | Proved by |
| --- | --- | --- | --- |
| 1 | A shared `packages/ui` renders in the vinext app, with Tailwind scanning the package | Keep components in `apps/web` | Walking skeleton |
| 2 | KV and D1 work locally under `pnpm dev` | A second dev mode on built output | Walking skeleton |
| 3 | vinext's data cache runs on KV through `kvDataAdapter`, with tags and time limits | Our own tagged cache on KV | Walking skeleton |
| 4 | An Agent can invalidate vinext's cache tags directly | The Agent calls an internal route in the same Worker | Walking skeleton |
| 5 | Cloudflare Access covers the Agents' WebSocket on the same hostname | An Access bypass for `/agents/*` plus a signed cookie check in the entry | Deploy pipeline and Access |
| 6 | A real `cf` deploy of this Worker (vinext, two Agent classes, KV, D1) and its rollback | A Wrangler config for this one app | Deploy pipeline and Access |
| 7 | Per-pull-request preview deploys with their own KV and D1 | Previews share one preview KV and D1 | Deploy pipeline and Access |
| 8 | Page render CPU on a real page fits Workers Paid comfortably | None needed; record the number | Deploy pipeline and Access |
| 9 | What Workers observability's Issues feature surfaces, and whether it can notify | ntfy from the Agents is already the alert path | Deploy pipeline and Access |
| 10 | Async `generateMetadata` lands in `<head>` (vinext #1492, #2007) | Static `metadata` with generic titles | Team page |
| 11 | A page reading `searchParams` in a server component is not cached | `dynamic = "force-dynamic"` in the layout | Players |
| 12 | Server Actions survive a deploy in an open tab (vinext #3604) | Reload the tab on a failed action | Players |
| 13 | ESPN's athlete game log is cheap and parses cleanly | No recent-games log | Players |
| 14 | The Scoreboard starts and stops polling with viewers, as the Game Agent did in the prototype | None; it is the same mechanism | Scoreboard Agent: live scores |
| 15 | The short gap in polls seen around a deploy does not lose plays | The first poll after resume diffs the whole game, so nothing is lost; confirm | Game Agent |
| 16 | How ESPN's rink coordinates map onto the drawing, and which end each team attacks each period | Mirror by period using the home team's first-period end | Rink and timeline |
| 17 | Variant C on a phone, the rink in light, the ledger in dark, and the rink overlay clear of the faceoff circles | Design decisions made in the issue, reviewed by Ryan | App shell; Rink and timeline |
| 18 | `gpt-oss-120b` returns output that passes the Prediction schema | The llama fallback becomes the main model | Predictions: generation |
| 19 | AI Gateway in front of the Workers AI binding | Call the binding directly and log prompts to D1 only | Predictions: generation |
| 20 | How long after it happens a play first appears on ESPN (the 10-second cadence is a guess) | Change the cadence | Live game verification |
| 21 | Whether plays are removed or reordered live, and what a revision changes | The diff already handles all three; confirm | Live game verification |
| 22 | ESPN's status values through intermissions | Adjust the intermission detection | Live game verification |
| 23 | How the scoreboard's clock and score compare in freshness with the summary's | Feed the game header from whichever is fresher | Live game verification |
| 24 | How ESPN represents an overturned goal | Stay silent, as now | Live game verification |
| 25 | How quickly ESPN updates standings after a final (the 5-minute second invalidation is a guess) | Move the timer | Live game verification |
| 26 | Durable Object duration billed for a watched game | None needed; record the number | Live game verification |
