# NHL play-by-play data for Game Streams

Research for issue #3. Observed 2026-10-05, about 18:45 to 19:00 UTC, by making real requests with `curl`.

## Answer

The NHL web API serves a complete, structured play-by-play for every game at `GET https://api-web.nhle.com/v1/gamecenter/{gameId}/play-by-play`, with no key or auth. Each response is the **whole game so far** (a snapshot, not a delta), about 13 KB gzipped for a finished game. Every play has a stable `eventId`, a monotonic `sortOrder`, a type, and for on-ice events `xCoord`/`yCoord` in feet on a fixed rink frame, which is enough for a rink view. There is no push channel and no "since" parameter: a Game Stream has to poll and diff by `eventId`. The CDN caches responses for about 20 seconds, so polling faster than that returns the same bytes.

**Not verified:** no game was live during this research (first puck drop was 23:00 UTC). Everything about live behaviour (how soon a play appears after it happens, whether plays are later corrected or removed, whether the cache lifetime is shorter during a live game) is unobserved. See "Open questions".

## Surprise: the Parity Reference does not call the NHL API

The issue asks for a comparison with `../yogan_hockey/lib/yogan_hockey/nhl/api_client.ex`. That client calls **ESPN**, not `api-web.nhle.com`:

| Parity Reference call | Host |
| --- | --- |
| scoreboard, teams, team, news, team schedule | `site.api.espn.com/apis/site/v2/sports/hockey/nhl` |
| standings | `site.api.espn.com/apis/v2/sports/hockey/nhl/standings` |
| season | `sports.core.api.espn.com/v2/sports/hockey/leagues/nhl` |
| player, player stats, search | `site.api.espn.com` / `site.web.api.espn.com` `apis/common/v3` |

It polls the scoreboard every 30 seconds (`live_scores_server.ex`) and teams every 5 minutes. It has no play-by-play.

Consequences for the rebuild:

- **ID spaces differ.** ESPN's id for FLA @ ANA on 2026-10-04 is `401891778`; the NHL's is `2026020037`. Team and player ids are separate numbering schemes too (ESPN athlete ids look like `5188599`, NHL player ids like `8483445`). If scores stay on ESPN and the Game Stream uses NHL, something must map games between them (date plus team abbreviations is the obvious join).
- **ESPN also has play-by-play.** `GET http://site.api.espn.com/apis/site/v2/sports/hockey/nhl/summary?event={espnId}` returned 319 plays for a finished game, each with `coordinate: {x, y}`, a `type`, prose `text`, `participants`, and a real-time `wallclock` timestamp. It was served with `Cache-Control: max-age=1`. This was only sampled once and not explored further; it is a real alternative that avoids the ID mapping.

## Endpoints

All under `https://api-web.nhle.com/v1`. Game used for the shapes below: **2026020037, FLA @ ANA, 2026-10-04, final in overtime** (`gameState: "OFF"`). A shootout game from last season (2025020709) was used for shootout events, and three more finished games from 2026-10-03 for the event-type census.

### Finding games

| Endpoint | Notes |
| --- | --- |
| `/score/now` | 307 redirect to `/score/{YYYY-MM-DD}`. Follow redirects. |
| `/score/{date}` | `games[]` with `id`, `gameState`, `gameScheduleState`, `startTimeUTC`, `clock`, `period`, `periodDescriptor`, teams with scores, and a `goals[]` list. |
| `/schedule/{date}` | `gameWeek[]` of seven days, each with `games[]`. No clock or goals. |

Game id format: `SSSSTTNNNN`, season start year, game type (`02` regular season; `gameType: 2`), game number.

`gameState` values seen: `FUT` (not started) and `OFF` (final, official). Live-state values were not observed. Community documentation lists `PRE`, `LIVE`, `CRIT` and `FINAL` as well; treat any state other than `FUT`/`PRE`/`FINAL`/`OFF` as in progress and confirm against a live game.

### `/gamecenter/{id}/play-by-play`

137 KB of JSON, 13 KB gzipped, for a 336-play overtime game. Top level:

- Game header: `id`, `season`, `gameType`, `gameDate`, `startTimeUTC`, `venue`, `gameState`, `gameScheduleState`, `periodDescriptor`, `clock` (`timeRemaining`, `secondsRemaining`, `running`, `inIntermission`), `displayPeriod`, `maxPeriods`, `regPeriods`, `otInUse`, `shootoutInUse`, `gameOutcome`.
- `awayTeam` / `homeTeam`: `id`, `abbrev`, `commonName`, `placeName`, `score`, `sog`, `logo`, `darkLogo`.
- `rosterSpots[]`: 40 entries, `teamId`, `playerId`, `firstName`, `lastName`, `sweaterNumber`, `positionCode`, `headshot`. This is the lookup table for every player id in `plays`.
- `plays[]`: the events.

For a game that has not started (`FUT`), the endpoint returns 200 with the header, `plays: []` and `rosterSpots: []`. A nonexistent game id returns 404.

Each play:

```json
{
  "eventId": 131,
  "sortOrder": 35,
  "periodDescriptor": {"number": 1, "periodType": "REG", "maxRegulationPeriods": 3},
  "timeInPeriod": "02:45",
  "timeRemaining": "17:15",
  "situationCode": "1551",
  "homeTeamDefendingSide": "left",
  "typeCode": 506,
  "typeDescKey": "shot-on-goal",
  "details": {
    "xCoord": -60, "yCoord": -15, "zoneCode": "O",
    "shotType": "snap",
    "shootingPlayerId": 8473419, "goalieInNetId": 8480843,
    "eventOwnerTeamId": 13,
    "awaySOG": 1, "homeSOG": 0
  }
}
```

There is **no wall-clock timestamp** on a play, only game-clock time. Plays carry no prose description either; text has to be composed from `typeDescKey`, `details` and `rosterSpots`.

#### Event types observed

Across five finished games (four from this season, one shootout game from last season):

| `typeCode` | `typeDescKey` | `details` fields | Coords |
| --- | --- | --- | --- |
| 502 | `faceoff` | `winningPlayerId`, `losingPlayerId`, `eventOwnerTeamId`, `zoneCode` | yes |
| 503 | `hit` | `hittingPlayerId`, `hitteePlayerId`, `eventOwnerTeamId`, `zoneCode` | yes |
| 504 | `giveaway` | `playerId`, `eventOwnerTeamId`, `zoneCode` | yes |
| 505 | `goal` | `scoringPlayerId`, `scoringPlayerTotal`, `assist1PlayerId`, `assist1PlayerTotal`, `assist2PlayerId`, `assist2PlayerTotal`, `goalieInNetId`, `shotType`, `awayScore`, `homeScore`, `eventOwnerTeamId`, `zoneCode`, highlight clip ids and URLs | yes |
| 506 | `shot-on-goal` | `shootingPlayerId`, `goalieInNetId`, `shotType`, `awaySOG`, `homeSOG`, `eventOwnerTeamId`, `zoneCode` | yes |
| 507 | `missed-shot` | `shootingPlayerId`, `goalieInNetId`, `shotType`, `reason`, `eventOwnerTeamId`, `zoneCode` | yes |
| 508 | `blocked-shot` | `shootingPlayerId`, `blockingPlayerId`, `reason`, `eventOwnerTeamId`, `zoneCode` | yes |
| 509 | `penalty` | `committedByPlayerId`, `drawnByPlayerId`, `servedByPlayerId`, `descKey`, `typeCode` (`MIN`, `BEN` seen), `duration`, `eventOwnerTeamId`, `zoneCode` | yes |
| 516 | `stoppage` | `reason`, `secondaryReason` | no |
| 520 | `period-start` | none | no |
| 521 | `period-end` | none | no |
| 523 | `shootout-complete` | none | no |
| 524 | `game-end` | none | no |
| 525 | `takeaway` | `playerId`, `eventOwnerTeamId`, `zoneCode` | yes |
| 535 | `delayed-penalty` | `eventOwnerTeamId` | no |

Roughly 83% of plays in the sample game (279 of 336) carry coordinates.

This list is what turned up in five games, not a closed set. Community documentation mentions others (for example `failed-shot-attempt` for a missed penalty shot or shootout attempt). The parser must tolerate unknown `typeDescKey` values and missing `details` fields: assists are absent on unassisted goals, `servedByPlayerId` only appears on bench penalties, `goalieInNetId` is absent on empty-net shots.

Enumerations seen:

- `shotType`: `wrist`, `snap`, `slap`, `backhand`, `tip-in`, `deflected`, `wrap-around`, `bat`, `poke`.
- Missed-shot `reason`: `wide-left`, `wide-right`, `high-and-wide-left`, `high-and-wide-right`, `above-crossbar`, `hit-crossbar`, `hit-left-post`, `hit-right-post`, `failed-bank-attempt`. Blocked-shot `reason`: `blocked`, `teammate-blocked`.
- Stoppage `reason` / `secondaryReason`: `icing`, `offside`, `goalie-stopped-after-sog`, `puck-in-netting`, `puck-in-crowd`, `puck-in-benches`, `puck-in-penalty-benches`, `puck-frozen`, `skater-puck-frozen`, `hand-pass`, `high-stick`, `net-dislodged-defensive-skater`, `referee-or-linesman`, `player-equipment`, `tv-timeout`, `home-timeout`, `visitor-timeout`, `chlg-vis-off-side` (a coach's challenge).
- Penalty `descKey`: `holding`, `tripping`, `cross-checking`, `roughing`, `too-many-men-on-the-ice` (many more exist).
- `periodDescriptor.periodType`: `REG`, `OT`, `SO`.

`situationCode` is four digits: away goalie in net (1/0), away skaters, home skaters, home goalie in net (1/0). `1551` is 5-on-5, `1451` is a home power play, `0651` is away net empty with six skaters. In a shootout it is `1010` or `0101`, marking which side is shooting. This reading is inferred from the data (it matches the `strength: "pp"` flag on the corresponding landing goal) and from community documentation, not from an NHL spec.

#### Coordinates for the rink view

- `xCoord` and `yCoord` are integers in **feet from centre ice**. Observed range across four games: x from -99 to 99, y from -42 to 42. That matches a 200 by 85 ft rink, with goal lines at about x = ±89. Centre-ice faceoffs are at (0, 0).
- The frame is **fixed to the building, not to the attacking team.** `homeTeamDefendingSide` (`left` or `right`) says which end the home team defends, and it flips each period (`left`, `right`, `left`, `right` in the sample game). Example: with home defending `left`, a home goal was at x = 50 and an away shot at x = -60.
- To draw both teams always attacking a fixed direction, flip x and y when `homeTeamDefendingSide` is `right` (or do the opposite per team). To draw the rink as the arena sees it, plot as given.
- `zoneCode` is `O`, `D` or `N` **relative to `eventOwnerTeamId`**. For a blocked shot the owner in the sample was the shooting team while the zone read `D`, so do not rely on `zoneCode` for blocked shots without checking; use the coordinates.
- Coordinates are a single point per event (where it happened). There is no puck or player tracking in this feed.

Goals also carry `pptReplayUrl`, for example `https://wsr.nhle.com/sprites/20262027/2026020037/ev382.json`, which is the player-and-puck tracking animation nhl.com shows for goals. A plain request to it returned **403 Access Denied**. It is on a different host with access control; do not plan on it.

### `/gamecenter/{id}/landing`

11 KB JSON. Same game header, plus `summary`:

- `summary.scoring[]`: per period, `goals[]` with scorer and assists already resolved to names, `strength` (`ev`, `pp`, ...), `goalModifier`, `shotType`, running `awayScore`/`homeScore`, `eventId` (joins to play-by-play), `timeInPeriod`, `homeTeamDefendingSide`, highlight clip URLs.
- `summary.penalties[]`: per period, with player names, `type`, `duration`, `descKey`.
- `summary.threeStars[]`: after the game.
- `summary.shootout`: `null` in the sample game; expected to list attempts for shootout games (not captured).

Useful as a cheap "scoring summary" with names pre-joined. It has nothing play-by-play does not, apart from three stars and goal `strength`.

### `/gamecenter/{id}/boxscore`

13 KB JSON. Game header plus `playerByGameStats.{awayTeam,homeTeam}.{forwards,defense,goalies}[]`.

- Skaters: `playerId`, `sweaterNumber`, `name`, `position`, `goals`, `assists`, `points`, `plusMinus`, `pim`, `hits`, `sog`, `blockedShots`, `giveaways`, `takeaways`, `shifts`, `toi`, `powerPlayGoals`, `faceoffWinningPctg`.
- Goalies: `saveShotsAgainst` ("29/31"), `savePctg`, `goalsAgainst`, `saves`, `shotsAgainst`, split by strength, `toi`, `starter`, `decision`.

### `/gamecenter/{id}/right-rail`

4 KB JSON, the sidebar on nhl.com's game page: `linescore` (goals by period and totals), `shotsByPeriod`, `teamGameStats[]` (`sog`, `faceoffWinningPctg`, power play, hits, and so on as `{category, awayValue, homeValue}`), `seasonSeries`, `gameInfo`, `gameReports`, `gameVideo`. This is the cheapest source of a live team-stats panel.

## Update cadence and caching

Observed on finished and future games:

- Every endpoint responded with `cache-control: no-transform, max-age=19, s-maxage=19` (occasionally 14 or 18) and `cf-cache-status: HIT`. Responses come from Cloudflare.
- The `ETag` is **not a content hash**. It is a hex Unix timestamp on a 20-second grid: `W/"6ac3f02c--gzip"` decodes to 2026-10-05 18:45:00 UTC, the previous one to 18:44:40. All endpoints share the same ETag at a given moment.
- `If-None-Match` with the current ETag returns `304`. With an ETag from an earlier 20-second window it returns `200` and the full body, even though the body was byte-identical (same SHA-256 across windows for the finished game). So conditional requests save bandwidth only when repeated inside one window, and **an ETag change does not mean the data changed.**
- A unique query string (`?_=...`) produced `cf-cache-status: MISS`, so the cache can be bypassed. That would be abusive to do routinely and is not recommended.

What this implies: the floor on freshness is about 20 seconds plus however long the NHL's scorers take to enter the event. Polling one game's play-by-play every 10 to 20 seconds is the sensible range; faster buys nothing.

**Not observed:** the cache lifetime during a live game, and the scorer-entry delay. Community reports generally describe the feed as trailing the broadcast by tens of seconds; that is hearsay here.

## Detecting incremental changes

There is no delta endpoint, cursor, or `since` parameter. Each poll returns the whole game. To turn snapshots into a stream of events:

1. Key plays by **`eventId`**. It was unique within every game sampled.
2. Order plays by **`sortOrder`**, which was unique and strictly increasing in array order. `eventId` is not ordered: in the sample game 119 of 335 adjacent pairs had a lower `eventId` after a higher one (the array starts 102, 101, 109, 105, 151).
3. On each poll, emit plays whose `eventId` has not been seen, in `sortOrder` order.
4. Also compare previously seen plays (hash each play's JSON). Scorers revise events after the fact, for example changing who gets an assist or adjusting a shot location, so the stream needs "updated" and probably "removed" messages as well as "added". Revision behaviour was **not observed** here because no game was live; the design should allow for it and the open question below should be settled against a live game.
5. Do not use "array got longer" or "ETag changed" as the change signal. Do not assume new plays only append at the end: `sortOrder` values have gaps (8, 11, 12, 16, 20, ...), which leaves room for late insertions between existing plays.
6. Read the scoreboard-level state (`clock`, `periodDescriptor`, team `score` and `sog`, `gameState`) from the same response; no second request is needed for a clock.

One poller per live game, fanned out to all viewers of that Game Stream, keeps upstream load independent of audience size. On a typical night that is at most about 16 games, and the dashboard only needs the ones somebody is watching.

## Rate limits and blocking

- No API key, cookie, or special header was needed. Requests used curl's default user agent.
- No `ratelimit-*` or `retry-after` headers appear on responses.
- About 45 requests over 15 minutes, including 12 back-to-back to one URL, all returned 200 in roughly 100 ms. No throttling was triggered. This says nothing about where the limit is, only that light use is fine. No attempt was made to find the limit.
- Responses carry **no `Access-Control-Allow-Origin` header**, so a browser on another origin cannot call the API directly. The Rust backend must fetch and relay. This suits the Game Stream design anyway.
- `api-web.nhle.com/robots.txt` is a 404.
- `wsr.nhle.com` (goal replay sprites) returned 403 to a plain client.

## Terms of use

The NHL publishes no API documentation, key programme, or developer terms for `api-web.nhle.com`. The only governing text is the nhl.com Terms of Service (last updated 2025-10-29), which says:

- Use is permitted "only for non-commercial, informational, personal use, without modification or alteration in any way".
- Users may not "engage in unauthorized spidering, scraping, or harvesting of content or information, or use any other unauthorized automated means to compile information".
- Team and league logos and marks "may not be reproduced or used commercially without the prior written consent" of the NHL.

Reading: polling the API from a server is automated access the terms do not authorise, so there is no entitlement to it and it can change or be blocked without notice. A private, non-commercial family dashboard at low volume is the kind of use the NHL has tolerated from the hobbyist community for years, but that is tolerance, not permission. Practical guardrails: keep the site non-commercial with no ads, poll no faster than the cache window, send an honest `User-Agent`, never bypass the cache, and build the Game Stream so that losing the upstream degrades the feature without breaking the rest of the site. This is not legal advice.

The same caveat applies to the ESPN endpoints the Parity Reference already depends on; they are equally undocumented.

## Open questions

These need a live game and could not be answered on the afternoon of 2026-10-05:

1. **Latency.** How long after a play happens does it appear in `plays`? NHL plays have no wall-clock time, so this needs a probe that logs first-seen time per `eventId` against the game clock (or against ESPN's `wallclock` for the same play).
2. **Revisions.** How often are existing plays edited, reordered or deleted, and do `eventId` and `sortOrder` survive an edit?
3. **Live cache lifetime.** Is `max-age` still about 19 seconds during a live game?
4. **Live `gameState` values** and what `clock.running` / `inIntermission` look like in play.
5. **Shootout summary shape** in `landing.summary.shootout`.
6. **NHL versus ESPN play-by-play:** which is fresher, and whether one source for everything (scores and plays) is simpler than mapping ids between two.

A probe that answers 1 to 4: during a live game, fetch `/v1/gamecenter/{id}/play-by-play` every 10 seconds, and log the response `cache-control`, `age`, `gameState`, `clock`, and for each play its `eventId`, `sortOrder` and a hash, recording first-seen time and any later change.

## Sources

All first-party, fetched 2026-10-05:

- `https://api-web.nhle.com/v1/score/now`, `/v1/score/2026-10-05`, `/2026-10-04`, `/2026-10-03`, `/2026-01-10`, `/2026-01-17`
- `https://api-web.nhle.com/v1/schedule/2026-10-05`
- `https://api-web.nhle.com/v1/gamecenter/2026020037/{play-by-play,landing,boxscore,right-rail}` (finished, OT)
- `https://api-web.nhle.com/v1/gamecenter/{2026020025,2026020026,2026020034}/play-by-play` (finished)
- `https://api-web.nhle.com/v1/gamecenter/2025020709/play-by-play` (finished, shootout)
- `https://api-web.nhle.com/v1/gamecenter/2026020040/play-by-play` (not started)
- `https://wsr.nhle.com/sprites/20262027/2026020037/ev382.json` (403)
- `http://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard?dates=20261004` and `/summary?event=401892442`
- `https://www.nhl.com/info/terms-of-service`
- Parity Reference source: `lib/yogan_hockey/nhl/api_client.ex`, `lib/yogan_hockey/nhl/live_scores_server.ex`

Claims marked as community documentation (extra `gameState` values, extra event types, the `situationCode` layout) are not from a first-party source and were only partly confirmed by the data.
