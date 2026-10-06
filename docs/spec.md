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

- Server components read cached ESPN data through `packages/espn`, call an Agent over Durable Object RPC (`getAgentByName`, given the namespace from `exports` in `cloudflare:workers`, which is the typed one) for first paint of live data, or query D1 through `packages/db`.
- An RPC result is copied to a plain object before it is passed to a client component.
- Server Actions handle on-demand reads from the browser: player search and resolving favorites.
- Client components hold the sockets with `useAgent`. Browsers are read-only: they can never write an Agent's state.
- The `@callable` decorator is not used.

### Rendering and caching

- Every page is rendered per request (`dynamic = "force-dynamic"`) and reads through the tagged KV cache. There is no page-level caching, and no page is static: the root layout reads the Scoreboard for the first paint of the score ticker, which every page has. `/family/rylan` is rendered per request like the rest; what is static about it is its data, a file in the site (see [Rylan](#7-rylan)).
- Every cached read sets its own time limit. Nothing relies on vinext's default, which caches for a year.

| Data | Time limit | Tag |
| --- | --- | --- |
| Standings | 5 minutes | `standings` |
| Team page (record, roster, team stats) | 1 hour | `team:{id}` |
| Team schedule | 1 hour | `team:{id}` |
| Player page, career stats and game log | 6 hours | `player:{id}` |
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
| `/players/:id` | Season stats, the recent-games log and the career table |
| `/family/rylan` | Rylan's page |
| `/yogan` | Redirects to `/family/rylan` |

Site-wide:

- Sidebar navigation, in the Parity Reference's order: Standings, Teams, Players, Family, Live Scores. The wordmark links to `/`. Below the `md` breakpoint the sidebar becomes a menu opened from the top bar, which closes on navigation.
- A light/dark toggle that follows the operating system until the visitor chooses. Both themes exist for every page.
- Page titles name the page, team or player.
- An unknown path, team or player gets a not-found page inside the normal layout.
- The footer credits ESPN as the data source.
- A score ticker on every page.
- Times are shown in the visitor's own time zone. The server writes Eastern time marked "ET", and the browser replaces it as the page loads.
- Scores update on every page without a refresh, through the Scoreboard socket.
- Every game card or game row, wherever it appears, links to that game's page.
- Tabs and standings views are held in the URL, so they survive a reload and can be linked.

### `/` Dashboard

Variant C, the "Tonight ledger": monospace type, one dense table per subject, no cards, no team logos.

- **Tonight's games**, with the live count in its header. Live rows are tinted. A note column carries the pick ("TOR 58%", or "pick pending") and a marker for a favorite team. Favorite teams' games sort first.
- **Family**: one row block for Rylan with his season totals, linking to `/family/rylan`.
- **Favorites**: up to four favorite players, each with a "live now" marker when his team is playing.
- **Standings**: each conference's top eight in a compact table, rows linking to teams, with a link to `/nhl`.
- **Season record of the picks**, in the header line of the Tonight's games table: "Picks: 34 right, 21 wrong".

Dropped from the Parity Reference: Quick Links, the NHL Teams grid, the standalone live/total game counter.

### `/nhl`

- **Standings** tab with four views held in the URL: Division, Conference, Wild Card, League.
- **Teams** tab: every team, linking to its page.

### `/nhl/live`

In Progress, Upcoming and Final sections. Each game row shows both teams with their records and the venue. An "updated" timestamp shows when the Scoreboard last heard from ESPN, so it moves on every good poll, changed or not. Final games link to their Replay.

### `/nhl/teams/:id`

- Header with the team's record.
- Tabs held in the URL: Schedule, Roster, Stats. Finished games on the schedule link to their Replay; this season only.
- Hearts on the roster to favorite a player, and one on the header to favorite the team.
- A banner linking to the game page when the team is playing now, and a Next Game card linking to the scheduled game's page.
- Toronto's roster has Rylan Yogan, #99, at the top (see [Rylan](#7-rylan)).

### `/players` and `/players/:id`

- Search starts at two characters and runs through a Server Action (`searchPlayers`) as the visitor types. The page reads `searchParams` in a server component: the search is held in the URL as `?q=`, so a search can be pasted, linked and reloaded, and works as a plain form without JavaScript. Each result shows name, number, position and team. ESPN failing to answer is said in words on the page, never an error page.
- The visitor's favorite players are listed.
- A player page has a header line (name, position, number, team link, then born, birthplace, height, weight, shoots or catches, draft and experience where ESPN has them) and no photo. Season stats come from the career table's row for the season ESPN's summary names, with the summary's league ranks under them; a skater's shots are counted from his game log, since ESPN's career table has none. The career table is every column ESPN sends for a skater or a goalie, newest season first, a season split between clubs as a total ahead of its clubs, with career totals and, for a skater, points per game. ESPN's headings are corrected where they mislead: `SOG` (shootout goals) is shown as `S/O G`, `S` (shots) as `SOG`, `SPCT` as `S%`, `WINS` as `W`, a game's `TOI/G` as `TOI`, and `PROD` is dropped.
- A recent-games log: the latest ten games of the latest season he played, newest first, each with the result and his line and linking to the game; `?games=all` shows the whole season. It is one extra ESPN request, cached with the rest of the page (proved in #35).
- An unknown id gets "Player not found" inside the layout, with a 404.

### `/nhl/games/:id`

See [Game pages](#5-game-pages). NHL games only.

## 4. The Agents

Both Agents poll only while someone is watching. A viewer is an open socket. Polling starts on the first connection and stops when the last one leaves. A timer that fires once is allowed with nobody watching; a loop is not.

Every site deploy restarts the Agents. They resume from stored state.

### Scoreboard

One instance. Every page connects to it.

- **Synced state**: today's games (teams with their records, score, period, clock, status, start time, venue). It is sent whole to every open page, so it is set only when a poll finds a difference; a poll that finds none sends open pages one small message with the time, which is what the "updated" timestamp follows.
- **Cadence**: every 30 seconds while a game is live or within 15 minutes of a scheduled start; every 5 minutes otherwise.
- **A visitor arriving while it is asleep**: if its stored state is older than one polling interval, it fetches from ESPN before answering, so first paint is current.
- **Game state** is read from ESPN's `status.type.state` (`pre`, `in`, `post`) and `status.type.completed`, never from the status name.

When it sees a game go final:

1. Writes the game row to D1 (teams, date, final score).
2. Invalidates the cache tags for standings, both teams, the players on both rosters, and the game. It does this directly, in-process (proved locally in #31; Unverified row 4 has what is left to confirm on Cloudflare).
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
- **The last poll** comes 30 seconds after the poll that first finds the game final, since ESPN may call a game final before its closing plays are in; the D1 write follows it. A game already final when it is first read is written at once, with no second poll. A final that ESPN sends with no plays is not written until it has some.
- **Told the game is over** means two changes of synced state: the header's status turns `final` when ESPN says so, and an `archived` flag turns true once the D1 write is done, which is when the page can become the Replay. The plays then leave the Agent's storage. The Game Agent sets its own 24-hour re-read when it archives.
- **A game that is not in progress**: a final game is never polled; a game still to start is polled as the Scoreboard polls (every 5 minutes, every 30 seconds from 15 minutes before its start) while its Agent has a viewer. An id ESPN does not know is reported to first paint as not found, raises no alert, and is asked about again every 5 minutes while a viewer stays.
- **A poll that finds more than 25 differences** sends every play once, as it does on connect, instead of a message for each.

### Alerts

Each Agent alerts on what it sees while in use:

- three failed ESPN polls in a row, or
- one response that fails to parse.

The Agent records when a problem starts and when it clears, in its own storage, and logs each once: an error line for the start, which Workers observability groups into an Issue, and a plain line for the all-clear. Nothing is pushed to a phone. That waits for the site to be a PWA with real push, and the one function that announces a start or an all-clear (`announce` in `apps/web/agents/espn-alert.ts`) is where it will be sent from.

Nothing watches the site while nobody is on it, and until push exists nobody is told of an Agent's alert: it is there to be read in the logs. The daily GitHub check (see [Testing](#10-testing)) is the early warning for ESPN changing shape, and its issue is the one notice that reaches Ryan.

## 5. Game pages

One page, `/nhl/games/:id`, in three states. It moves between them without a reload.

Variant C, "Rink as the page": the rink fills the width, with the score, shots and clock laid over it and the latest play captioned on the ice. Beneath it is a horizontal period timeline. Below that are tabs: Plays, Scoring, The pick.

### Scheduled

The matchup and the full Prediction. When the Scoreboard reports the game live, the page switches to the Game Stream on its own.

### Live: the Game Stream

- The page opens on **key plays** (goals, penalties, shots on goal, period starts and ends). A toggle shows every play.
- Timeline ticks are taller for goals and carry a distinct mark for penalties. Clicking a tick or a play highlights it on the rink.
- Plays with a coordinate are drawn on the rink. ESPN gives coordinates in feet from centre ice on about 93% of plays, fixed to the building: a play is drawn where ESPN puts it, with nothing mirrored by period. Which end each team shoots at in a period is read from where the shots fell, and written at each end of the rink where the rink is wide enough to write on (Unverified row 16).
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
- **Model**: Workers AI `@cf/openai/gpt-oss-120b` through the Worker's AI binding, routed through AI Gateway (`yogan-hockey`) for its log of prompts and responses. The model is held to the answer's shape with the binding's `response_format` of type `json_schema`.
- **Inputs**, all from ESPN's summary for the scheduled game: both teams' records and standings position, last five games, the season series, goalies, injuries, team leaders, home or away. Betting lines are excluded and never shown.
- **Output**, validated by the schema in `packages/schemas`: the picked team, that team's win probability as a percentage, two or three sentences of reasoning, and up to three key factors.
- **Failure**: one retry on invalid output, then `@cf/meta/llama-3.3-70b-instruct-fp8-fast` once. A call that throws or times out counts as invalid output. If that fails the game has no Prediction, nothing is shown, and it is not tried again. A computed substitute is never shown as a Prediction. If ESPN's summary cannot be read on three polls, the game is marked failed without a model being called.
- **Cap**: one Prediction per game and at most 40 model calls a day, enforced in our own code. The day is the slate's date. A game the cap cuts short keeps the calls it has had and is taken up again on the next slate if it has still not started.
- **A game that has started** when it is first seen, or by the time its turn comes, gets no Prediction and no row.

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

**Local development.** `pnpm dev` applies the D1 migrations to the local database, then runs the vinext dev server on port 5173 with KV, D1 and the Agents simulated locally. Local state lives in `apps/web/.cloudflare/state`. One environment variable switches `packages/espn` to fixture mode, where it reads its recorded responses. Fixture mode is used for offline work and by Playwright.

**D1.** Three tables: `games` (one row per finished game), `plays` (one row per play, keyed by game and ESPN play id), `predictions` (one row per game, keyed by game id, so a second Prediction for the same game is impossible). A prediction row holds the pick, when it was made, the model that made it, a compact copy of what the model was given, and a status of made or failed. Migrations are generated by Drizzle and additive only. Predictions are kept indefinitely.

**CI**, on every pull request: Biome, typecheck, Vitest, Playwright, a production build. `main` requires a pull request with green CI and no required reviewer. Preview deploys of pull requests are built (on a preview KV and D1 that all previews share) and switched off: a preview is not yet known to get Agents of its own (Unverified row 7).

**Deploy**, on a merge to `main`: apply D1 migrations, then deploy the Worker with `cf`. There is no staging and no guard against deploying during a live game; viewers reconnect and receive the plays again.

**Who can reach it.** Anyone: the site is public on `hockey.yogan.dev`, which is the Worker's only address (`workers.dev` and preview URLs are off). Nothing stands in front of it, pages or sockets. `scripts/check-public.sh` checks both halves.

**Rollback**: the Worker's previous version through `cf` (`scripts/rollback.sh previous`), live within seconds. The database only moves forward.

**Secrets.** GitHub Actions holds a scoped Cloudflare API token and the account id. The Worker holds none. Local development uses a gitignored env file.

**Plan.** Workers Paid, about $5 a month. A page render is at the Workers Free CPU limit already: `/nhl` measured a median of 13 ms on Cloudflare against Free's 10 ms.

**Observability.** Workers logs, traces and Issues are enabled in the Worker's config; `scripts/worker-logs.sh` reads the logs. Issues groups the Worker's exceptions and error logs, an Agent's alert among them (see [Alerts](#alerts)), and can notify, but nothing is set up to. There is no error tracking service, no cron trigger and no uptime monitor.

## 10. Testing

No coverage target. Most of the effort goes on the Agents.

- **`packages/espn`**: Vitest on committed fixtures, with snapshots of the translated shapes. `pnpm record:fixtures` refetches a fixed list of endpoints and is rerun by hand.
- **Agents**: Vitest inside the Workers runtime (`@cloudflare/vitest-pool-workers`), with ESPN replaced by fixtures. Cases: polling starts and stops with viewers; new, changed and removed plays; a stall; a final triggering the cache invalidation and the D1 writes; catch-up after a quiet spell.
- **Site**: one Playwright smoke test per route, against `pnpm dev` in fixture mode.
- **Daily live check**: a scheduled GitHub Actions run fetches live ESPN and runs the parsers. On failure it opens or updates an issue labelled `needs-triage` naming the endpoint and the parse error; the first run that passes comments on it that the check cleared. The issue is the alert: nothing is pushed.
- **Parity**: a checklist issue, one line per carried-over behaviour. Ryan ticks it by eye with both sites side by side.

## 11. Launch and cutover

- The site is public on `hockey.yogan.dev` before parity. Cloudflare Access stood in front of it, allowing only Ryan's email, until 2026-10-06, when Ryan had it removed: an unfinished site that people can visit is fine.
- The launch is Ryan calling parity from the checklist (#55). Nothing is switched on or off at that moment.
- Then the cutover: one last Fly release turns the Parity Reference into a redirect: `/`, `/nhl`, `/nhl/live`, `/nhl/teams/:id`, `/players` and `/players/:id` keep their path on `hockey.yogan.dev`, `/yogan` goes to `/family/rylan`, and anything else goes to the home page.
- The redirect stays for the rest of the 2026-27 season. Then the Fly app is destroyed.

## Unverified

Each line is something the design assumes and nobody has run. The build issue named is where it gets proved; if it fails there, the fallback applies and this spec is corrected.

| # | Assumption | Fallback if it fails | Proved by |
| --- | --- | --- | --- |
| 1 | **Proved (#31).** A shared `packages/ui` renders in the vinext app, with Tailwind scanning the package. The package's `theme.css` carries the `@source` line. shadcn's Base UI components arrive without `"use client"`, and one rendered directly by a server component needs it added (Button and Badge have it) | Not needed | Walking skeleton |
| 2 | **Proved (#31).** KV and D1 work locally under `pnpm dev`, which applies the D1 migrations with `cf d1 migrations apply --local` before it starts | Not needed | Walking skeleton |
| 3 | **Proved (#31).** vinext's data cache runs on KV through `kvDataAdapter`, with tags and time limits, using `unstable_cache` | Not needed | Walking skeleton |
| 4 | **Proved locally (#31).** An Agent can invalidate vinext's cache tags directly, by calling `revalidateTag` in-process and awaiting the write (`invalidateTag` in `apps/web/lib`). **Still open on Cloudflare (#33):** the Worker is deployed, and nobody has yet pressed "Bump the Agent" on the deployed `/skeleton`; Access let only Ryan in until 2026-10-06, so the agent that deployed it could not. The Agent and a page render may be separate isolates there: confirm that the Agent's isolate has the KV cache registered (the serial in section 2 changes after a bump), and measure how long a reload takes to show it (the adapter remembers a tag for 5 seconds, and KV itself can serve a marker up to 60 seconds old) | Not needed locally. If the deployed check fails, the Agent calls an internal route in the same Worker | Walking skeleton; deploy pipeline and Access |
| 5 | **Not applicable since 2026-10-06.** Cloudflare Access covers the Agents' WebSocket on the same hostname. Ryan had Access removed and the site is public (section 11), so nothing has to cover the socket. What was seen while it stood (#33): without a session, a WebSocket upgrade to `/agents/...` got Access's login redirect, as every page and static file did. Never seen: a signed-in browser's socket connecting through Access | Not needed | Nothing: Access is gone |
| 6 | **Proved (#33).** A real `cf` deploy of this Worker (vinext, two Agent classes, KV, D1) and its rollback. `cf d1 migrations apply` then `cf deploy --tag --message` created the Worker, both Agent classes and the custom domain on 2026-10-06, as `deploy.yml` has them, and it served pages from the first request. Rolling back is `cf workers deployments create` naming the older version (`scripts/rollback.sh`); it was done twice each way, and requests were answered by the older version during it. Not yet run: `--secrets-file`, and the same steps from GitHub Actions | Not needed | Deploy pipeline and Access |
| 7 | Per-pull-request preview deploys with their own KV and D1. **Replaced by the fallback for the stores, and still open (#33); no preview has been deployed.** `cf previews deploy` (1.0.0-beta.12) binds KV and D1 as the config names them and has no per-preview stores, so previews share one preview pair. Two things keep the preview job switched off (`scripts/deploy-gate.sh`). The Agent binding must name its Worker, cf sends that name with a preview as it stands, and cf's own code counts only a binding without one as the preview's, so a preview's page may drive production's Agents, which write production's KV and D1. And cf uploads a preview with preview addresses forced on, which are public `workers.dev` addresses; production has them off. cf has no dry run for a preview and no command to delete one. Needed: a binding that gives a preview its own Agents (or cf doing so), proved by bumping the skeleton Agent on one preview and finding the row in the preview D1 only | Previews share one preview KV and D1 | Deploy pipeline and Access |
| 8 | **Proved (#33).** Page render CPU on a real page fits Workers Paid comfortably. From Workers telemetry on 2026-10-06, 69 renders of `/nhl` on Cloudflare: median 13 ms of CPU, 90th percentile 26 ms, largest 80 ms; the home page, 11 renders, median 5 ms, largest 81 ms. The Paid limit is 30 seconds a request. Wall time over all 87 requests: median 44 ms, largest 508 ms | None needed; record the number | Deploy pipeline and Access |
| 9 | **Proved (#33).** What Workers observability's Issues feature surfaces, and whether it can notify. It groups a Worker's failures by fingerprint into issues of type exception, log (an error-level log line) or unknown (on this account, a suspected vulnerability scan), each with a count, first and last seen, and a status of active, resolved or ignored (`cf observability issues list --service yogan-hockey`; none for this Worker so far). It can notify on its own: an automation (`cf observability issues automations`) sends an issue to an account Notification policy after a number of occurrences or a spell of inactivity. The account has no automation, and one needs a Notification policy first (email or a webhook), which is Ryan's to add if he wants it | The Agents' alert is an error line in the logs, which Issues groups; nothing notifies | Deploy pipeline and Access |
| 10 | **Proved (#43), with one correction.** An async `generateMetadata` titles the page: `/nhl/teams/21` is "Toronto Maple Leafs · Yogan Hockey" in the browser, in `pnpm dev` and in a production build. Where the `<title>` sits depends on who asks, as in Next.js. A browser is sent it late, in a hidden `<div>` at the end of `<body>`, and it stays there (`document.title` reads it; nothing moves it into `<head>`). A link preview or crawler (vinext's list: Slackbot, WhatsApp, Twitterbot, facebookexternalhit, Applebot, Googlebot and others, matched on the user agent) gets it in `<head>`. `e2e/team.spec.ts` asserts both. Not yet seen on Cloudflare | Not needed | Team page |
| 11 | A page reading `searchParams` in a server component is not cached | `dynamic = "force-dynamic"` in the layout | Players |
| 12 | Server Actions survive a deploy in an open tab (vinext #3604) | Reload the tab on a failed action | Players |
| 10 | Async `generateMetadata` lands in `<head>` (vinext #1492, #2007) | Static `metadata` with generic titles | Team page |
| 11 | **Proved (#44).** A page reading `searchParams` in a server component is not cached. In a production build under `vite preview`, `/players` without `force-dynamic` answered every `?q=` with its own render and `cache-control: private, no-cache, no-store`, where `/`, which reads nothing from the request, answered `x-vinext-cache: HIT` with `s-maxage=31536000`. `/players` declares `force-dynamic` anyway, as every page does. The contrast is the finding to keep: a page that reads nothing from the request and omits `force-dynamic` is cached for a year | Not needed | Players |
| 12 | **Failed as assumed; the fallback is in (#44).** A Server Action does not survive a deploy in an open tab under vinext 1.0.1. Rebuilding (even the same code) and restarting `vite preview` under an open `/players`: the action's id is unchanged (`9e17e12527c0#searchPlayers`) and the new Worker runs it and answers 200, but every build has a new `x-vinext-rsc-compatibility-id`, so the old tab's client drops the answer, resolves the call with `undefined`, and hard-navigates to the URL the action was called from. The search box therefore writes the search into the URL before calling the action, treats no answer as a failed call, and loads the search's URL, which the server renders without an action: seen to recover to the ten results with no error. Any other Server Action called from a client component must expect `undefined`. Not yet seen on Cloudflare: that a real deploy changes the id in the same way, and what a tab does while two versions are being served during a gradual rollout | Reload the tab on a failed action: applied | Players |
| 13 | **Proved (#35).** ESPN's athlete game log is one request (`athletes/{id}/gamelog`, 10 to 30 KB) and parses cleanly for a skater and a goalie: `getPlayerGameLog` in `packages/espn` | Not needed | ESPN: players, search and the game summary |
| 14 | **Proved (#39).** The Scoreboard starts and stops polling with viewers, as the Game Agent did in the prototype. `apps/web/agents/scoreboard-agent.test.ts` proves it in the Workers runtime: the first socket sets a one-off timer, each poll sets the next while a socket is open, the last socket to close cancels it, and the timer and the sockets outlive a restart of the Agent. Not yet seen on Cloudflare with a real browser, which comes with the score ticker (#41) | Not needed | Scoreboard Agent: live scores |
| 15 | **Proved (#48).** The short gap in polls around a deploy does not lose plays. `apps/web/agents/game-agent.test.ts` restarts the Game Agent in the Workers runtime in the middle of a game, with a viewer connected and 50 plays stored: the timer set before the restart fires, that poll reads the whole game and compares it with the stored plays, and the viewer is sent the ten plays added and the one revised meanwhile and nothing twice. The viewer's list and the stored list both end equal to ESPN's. Proved against the recorded game cut short, not yet across a real deploy during a live game | Not needed | Game Agent |
| 16 | **Settled (#49), from 14 finished games: the recorded shootout (401803652) and the 13 finals of 2026-10-03, read from ESPN on 2026-10-06.** ESPN's coordinates are fixed to the building, not to the attacking team: x runs -100 to 100 along the ice and y -42.5 to 42.5 across it (seen: -98 to 99, -41 to 42), and in the recorded game every faceoff ESPN locates is on a real dot (x of 20 or 69, y of 22). In all 14 games each team's shots (goals, shots on goal, misses) fall almost wholly at one end (the least one-sided period in the 14 is 8 shots to 2) in the 1st, the other in the 2nd, back in the 3rd, and the other again in overtime (four games); in the recorded shootout each team shoots at the end it had in the 1st. For the fixture's home team, shots right of centre against left: 17/0, 0/12, 8/1, 0/5, then 4/0 in the shootout; the away team is the reverse. So a play is drawn at ESPN's x and y with **no mirroring**, and the assumption that the drawing would need mirroring by period was wrong. Which end the home team starts at is not fixed: right in 9 games, left in 5. So `attackedEnd` (`apps/web/lib/game/rink.ts`) reads it from the shots: a period's own shots decide when they lean one way by three or more, and otherwise the whole game does, counting teams as changing ends each period. Blocked shots are left out, because ESPN puts them where the blocker stood. **Not settled by the data:** whether ESPN's positive y is the far or the near boards. The drawing puts it at the top, as shot charts do; the other choice is the same rink seen from the other side, with every dot still at the right end and the right distance from the middle | Not needed. If the y direction proves wrong, negate y in `rinkPoint` | Rink and timeline |
| 17 | Variant C on a phone, the rink in light, the ledger in dark, and the rink overlay clear of the faceoff circles. **Shell half settled (#38), pending Ryan's look at `docs/design/shell/`.** On a phone the sidebar becomes a 44px top bar that stays in view: the wordmark, the theme toggle and a "menu" button. The menu drops a panel of the five links from under the bar, each a row tall enough for a thumb, and closes on a link, on Escape or on a tap outside. Page padding drops from 24px to 16px; ledger cells wrap, and a table still too wide scrolls sideways inside its own box. The ledger in dark takes its colours from the game page's variant C (slate 900 ground, slate 100 text, slate 800 rules, red 400 for live); the toggle sits at the foot of the sidebar. **Rink half settled (#49), pending Ryan's look at `docs/design/game/`.** The overlay keeps clear of every faceoff circle: each score stands in the strip between an end-zone circle and the blue line (24.5% in from each end, where the Reference UI had it at 13%, on top of the circle), and the clock over centre ice above the centre circle; the caption sits low on the ice between the lower circles, at most half the rink wide. All of it is placed and sized as a fraction of the rink's own width, so it holds its place at any size. Where the rink is under 672px wide (a phone, or a narrow column beside the sidebar) each score becomes a small stack (team, score, shots on goal) in the same strip, the caption moves under the rink as two lines, and the note at each end saying who shoots there is left off; the plays list is one column until it has 768px to itself; nothing scrolls sideways at 390. The rink in light is white ice on the paper ground with the same lines a step darker (red 600, blue 600) and the same opacities, darker dots, and a dark ring on the play in focus; the timeline is the ledger's secondary ground | Design decisions made in the issue, reviewed by Ryan | App shell; Rink and timeline |
| 18 | **Proved (#52).** `gpt-oss-120b` returns output that passes the Prediction schema: 9 of 9 on the first call for the nine scheduled games of 2026-10-06, through the binding, 8 to 25 seconds a call and about a tenth of a cent each. It answers as a chat completion (`choices[0].message.content`, the JSON as text) and needs `max_tokens` well above the default 256, which its thinking uses up. The llama fallback passed 7 of 9 on the same games; its misses were reasoning of four sentences or more | Not needed | Predictions: generation |
| 19 | **Proved (#52).** AI Gateway in front of the Workers AI binding: `env.AI.run(model, request, { gateway: { id: "yogan-hockey" } })` from `AI_REMOTE=1 pnpm dev` put each of the nine calls in the gateway's log with its prompt, its answer, tokens, cost and the `gameId` sent as metadata. Not yet seen from the deployed Worker, where the binding is the same call | Not needed | Predictions: generation |
| 20 | How long after it happens a play first appears on ESPN (the 10-second cadence is a guess) | Change the cadence | Live game verification |
| 21 | Whether plays are removed or reordered live, and what a revision changes | The diff already handles all three; confirm | Live game verification |
| 22 | ESPN's status values through intermissions | Adjust the intermission detection | Live game verification |
| 23 | How the scoreboard's clock and score compare in freshness with the summary's | Feed the game header from whichever is fresher | Live game verification |
| 24 | How ESPN represents an overturned goal | Stay silent, as now | Live game verification |
| 25 | How quickly ESPN updates standings after a final (the 5-minute second invalidation is a guess) | Move the timer | Live game verification |
| 26 | Durable Object duration billed for a watched game | None needed; record the number | Live game verification |
