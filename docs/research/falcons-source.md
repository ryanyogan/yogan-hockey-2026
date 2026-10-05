# Stats source for Rylan Flaherty and the "Chicago Falcons"

Research for issue #5. Checked 2026-10-05. Every claim below is traced to a page the club or league itself publishes; nothing here goes beyond what those public roster, schedule and standings pages show.

## Answer in brief

- **Organisation:** the Falcons Hockey Association (FHA), Highland Park, IL, a Chicago north-suburban youth club. No current organisation is literally named "Chicago Falcons"; this is the only Falcons club whose public roster lists him.
- **Team:** FHA **Peewee A2** (12U), 2026-27 season. The public roster lists **#6 Rylan Flaherty**.
- **League:** most likely the **CSDHL Prospects Division** (Central States Development Hockey League). This is inferred, not stated on the team page (see "Confidence").
- **Stats platform:** **GameSheet** (`gamesheetstats.com`), embedded by CSDHL. The club's own site (Crossbar) publishes roster and schedule only: no scores, no stats.
- **API:** no documented public API on either platform. GameSheet's stats pages sit behind a Cloudflare bot challenge that rejects non-browser clients; I did not go past it.
- **His current stats:** **not retrieved.** The only place they would be published is GameSheet, which I could not read. See "What I could not verify".

## Identification

### Which "Chicago Falcons"

| Candidate | What it is | Verdict |
|---|---|---|
| Falcons Hockey Association, Highland Park IL (`falconshockey.org`) | Youth club, Mite through Midget U16 | **Match**: roster lists the player |
| "Junior Falcons" in the Chicago United Hockey League (CUHL) | The same FHA club's entry in CUHL; its club page links to `falconshockey.org`. CUHL describes itself as an 8U league | Same organisation, but the wrong age level for a Peewee team. A plausible origin of the "Chicago ... Falcons" wording |
| Chicago Falcons, Illinois Ice Hockey League, 1961-62 | Defunct senior amateur team (hockeydb) | Not relevant |
| Lady Falcons / Chesterfield Falcons | Missouri club that appears in Illinois league listings | Different organisation |

Sources: <https://www.falconshockey.org/>, <https://www.chicagounitedhockey.com/club/junior-falcons/850>, <https://www.hockeydb.com/stte/chicago-falcons-11685.html>.

### Which player

I checked the public roster page of each FHA travel team for the surname. Exactly one match: **Peewee A2**, jersey **#6**, "Rylan Flaherty", roster tag `NTF`. No other Flaherty and no second plausible match on any FHA roster, so there is nothing to disambiguate.

- Roster: <https://www.falconshockey.org/team/242084/roster>
- The tag `NTF` is not explained on the page. The trailing `F`/`G` reads as forward/goalie; the `T`/`NT` prefix is unexplained and I have not guessed at it.

## Where data is published

### 1. Club site: Crossbar (roster and schedule)

`falconshockey.org` is hosted on Crossbar (`crossbar.org`). Team id for Peewee A2 is `242084`, under "2026-27 Falcons Squirt-Midget Fall Season".

| Page | URL | Contents |
|---|---|---|
| Home | `/team/242084` | Week-ahead calendar, coaching staff |
| Roster | `/team/242084/roster` | Jersey number, name, tag. No stats |
| Games | `/team/242084/games` | Date, opponent, rink, time. **No scores** |
| Schedule | `/team/242084/calendar` | Games, practices, other events |

- Server-rendered HTML; plain `curl` with a browser user agent returns 200. No JSON endpoint, iCal or feed link appears in the page markup, so this is scrape-only.
- Games listed so far: Sep 20 Bloomington, Sep 26 St. Jude, Oct 2 Vipers, Oct 3 Wilmette, Oct 17 Glenview, Oct 18 Chargers. Past games show no result.
- Roster pages include other children's names and, for some, photos. Any scraper should extract only the one tracked player's row.

### 2. League: CSDHL Prospects on GameSheet (scores, standings, stats)

CSDHL's site (`csdhl.org`, also Crossbar) embeds GameSheet in iframes:

| CSDHL page | GameSheet season id |
|---|---|
| Standings / Scores / Schedules, "Prospects Declaration Round" | `15219` |
| Standings, "Prospects Regular Season" | `15881` |

- Embed URLs take the form `https://gamesheetstats.com/seasons/{id}/standings`, `/scores`, `/schedule`.
- FHA's own "CSDHL Prospects FAQ" (dated 6/9/25) says Prospects games are scored with GameSheet, and describes the format: 8 declaration-round games, then a 20-game regular season, then playoffs. That FAQ describes 2025-26; I assume 2026-27 follows the same shape.
- GameSheet's product pages say it publishes scores, standings, schedules, and player and goalie stats, offered through iframe embeds or direct links. I found no documented public API.

Sources: <https://www.csdhl.org/about/standings-prospects-declaration-round/181352>, <https://www.csdhl.org/about/standings-prospects-regular-season/181353>, FHA FAQ linked from <https://www.falconshockey.org/parent-resources/csdhl-prospects-faq/109662>, <https://help.gamesheet.app/article/10-scores-schedule-standings-stats-embed-tool>.

### Access constraint on GameSheet

`curl` requests to `gamesheetstats.com/seasons/15219/standings` return **HTTP 403 with a Cloudflare "Just a moment..." challenge**. I stopped there: getting past a bot check is not something to do casually, and it bears directly on the design decision. Consequences:

- A server-side poller (the pattern presumably used for the German pro league) will not work against GameSheet as-is.
- Two guessed legacy JSON paths (`/api/useSeasonDivisions/...`) returned 404; the site is now a Next.js app. I did not probe further.
- Realistic options: ask GameSheet or CSDHL for sanctioned data access; link out to or iframe the GameSheet page (the supported route); or enter his stats by hand after games.

### Ruled out: NIHL

The Northern Illinois Hockey League has an open, unauthenticated JSON API at `https://ww2.nihl.info/` (`seasons`, `clubs`, `teams`, `games`, with `filter[...]` and `expand` parameters). It lists the Falcons (club id 59) for seasons 10 to 12, ending 2024-25, and returns **no Falcons teams for 2025-26 or 2026-27** (season id 15). So NIHL is not the source, although its API would have been the easiest to use.

## What is available, by data type

| Data | Source | Machine-readable? |
|---|---|---|
| Roster (number, name) | Crossbar team page | HTML scrape |
| Schedule (games and practices) | Crossbar team page | HTML scrape |
| Game scores | GameSheet season pages | Behind Cloudflare challenge |
| Standings | GameSheet | Behind Cloudflare challenge |
| Player season totals / game log | GameSheet, if the league enables player stats | Not verified |
| Live scores | GameSheet advertises live updates | Not verified |

## Confidence

- **Organisation, team and player: high.** The club's own roster page lists the name on one team only.
- **League is CSDHL Prospects: medium.** Evidence: FHA publishes a CSDHL Prospects FAQ and links CSDHL from its home page; the team's opponents correspond to clubs fielding Peewee "Prospects"/"A2 Prospect" teams (per a web search, not individually verified); FHA left NIHL after 2024-25. The team page itself names no league.
- **GameSheet as the stats platform: medium-high**, conditional on the league being right.

## What I could not verify

1. That FHA Peewee A2 appears in GameSheet season `15219` or `15881`, and which tier it is in.
2. Whether those season ids are 2026-27 or left over from 2025-26. The ids are lower than CUHL's 2025-26 season id (`15725`), so they may be stale links on the CSDHL site.
3. Whether CSDHL enables individual player stats for Peewee Prospects, and so whether any stats for him exist publicly.
4. His current stats.

The quickest way to close all four: the owner opens the CSDHL "Prospects Declaration Round" standings page in a browser, finds the Falcons Peewee A2 entry, and notes the GameSheet team URL and whether a player-stats tab exists.
