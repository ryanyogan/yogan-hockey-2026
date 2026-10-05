# Data source for Andrew Yogan (the "DEL2" ticket)

Research for issue #4. All sources were fetched on 2026-10-05. Endpoints marked "tested" were called with `curl` that day; about ten requests in total went to the stats API.

## Answer

**The premise is out of date: Andrew Yogan is not in DEL2 in 2026-27.** He signed with ESV Kaufbeuren, who play in the **Oberliga Süd**, the third tier, run by the German federation (DEB) rather than by the DEL2 league company. [esvk-signing] He has played all six of Kaufbeuren's games so far this season. [hd-team]

**Yes, there is a much better source than Elite Prospects for his current league, and it is the federation's own.** DEB's stats site is a thin page around JavaScript widgets from **hockeydata** (the provider's "LOS" system), and those widgets read a JSON API at `api.hockeydata.net`. One request returns his season totals plus a per-game log; one more returns Kaufbeuren's full 52-game schedule with scores, the roster and every skater's stats. The same API carries live game state. [hd-player] [hd-team] [hd-schedule]

**Recommendation: use the hockeydata API for season stats, game log, schedule, standings and live scores, under our own API key.** hockeydata issues keys on request, bound to the requesting site's domain, and requires the league's written consent for "own statistics portals or statistics applications". [hd-key] So the path is: ask DEB's league office for consent, then request a key. Until that is granted, the API is technically reachable only by sending DEB's own key and claiming to be `deb-online.live`, which is not something to ship.

**Career history needs a second source**, because hockeydata only knows the current division. Two options: the season-by-season table on HockeyDB that the Parity Reference already scrapes (it already has the 2026-27 Kaufbeuren row), or Elite Prospects' official developer API, which advertises a free tier. Since career history changes once a year, a static table checked into the repo and updated by hand is also a fair answer.

**For DEL2 itself, as the ticket asked:** no API or feed was found. del-2.org is server-rendered HTML from its site vendor, and its player pages credit Elite Prospects for career data. That matters only if he returns to DEL2.

## Where he plays

| Season | Team | League | Source |
|---|---|---|---|
| 2024-25 | Dresdner Eislöwen | DEL2 (champions, promoted) | [eisloewen-exit] |
| 2025-26 | Dresdner Eislöwen, 30 games, 8 goals, 5 assists | DEL (top tier) | [eisloewen-exit] |
| 2025-26, from February | Stavanger Oilers | Norway, top division | [eisloewen-exit] |
| 2026-27 | ESV Kaufbeuren, number 12 | Oberliga Süd | [esvk-signing] |

- Dresden and Yogan terminated his contract by mutual agreement on 2026-02-06 and he finished the season in Norway. [eisloewen-exit]
- Kaufbeuren announced him on 2026-05-07 as the first of three import ("Kontingent") players for 2026/2027. [esvk-signing]
- Kaufbeuren is not among the 14 clubs listed on del-2.org for this season, and DEB's API lists it in the division named "Oberliga Süd". [del2-home] [hd-schedule]

What the Parity Reference assumes, all of it now wrong for the current season:

- `lib/yogan_hockey/del2.ex` hardcodes team "Dresdner Eislöwen", league "DEL", season "2025-26" and Dresden's arena, colours and logo as defaults.
- `lib/yogan_hockey/del2/elite_prospects_scraper.ex` scrapes Elite Prospects team id `983` (Dresden) at the `2025-2026/del` games URL for the schedule, and decides home or away by looking for "dresden" in the team name.
- Player stats come first from HockeyDB player id `106875`, with Elite Prospects player id `13839` as fallback. These two ids are still right; they follow the player, not the team.
- Data used: season totals (games, goals, assists, points, penalty minutes, plus/minus), a career table of the same columns per season, and a schedule of past and upcoming games (date, opponent, home or away, score, result). No game log and no live scores.

The repo's `GLOSSARY.md` defines "DEL2" as "the German second-tier professional league Andrew Yogan plays in". That entry is also out of date.

## Candidate sources

| Source | Season stats | Game log | Schedule and results | Live scores | Career history | Format | Permission |
|---|---|---|---|---|---|---|---|
| hockeydata API (DEB's provider) | Yes | Yes | Yes | Yes | No | JSON | Own key needed; league consent required for a stats app |
| ESV Kaufbeuren club site | Yes | No | Yes | No | No | Hand-edited HTML tables | No stated terms found |
| HockeyDB | Yes (totals only) | No | No | No | Yes | HTML table | Bots prohibited; posting one player's career stats explicitly welcomed |
| Elite Prospects website | Yes | Not checked | Yes | No | Yes | HTML, changes often | Robots file blocks its internal JSON paths; official API offered instead |
| Elite Prospects developer API | Advertised | Advertised | Advertised | Not advertised | Advertised | JSON | Official; free tier advertised; not tested |
| del-2.org | DEL2 seasons only | Not found | DEL2 only | Page that reloads every 60 s | Credited to Elite Prospects | HTML | No API; not his league now |

## hockeydata API (recommended)

### What it is

- DEB's Oberliga pages on `deb-online.live` are WordPress pages that embed hockeydata widgets: `hockeydata.los.Schedule`, `Standings`, `Leaders`, `TeamStats` and others, each configured with an API key, `sport: icehockey` and a division id. [deb-ols]
- The widget library is loaded from `https://api.hockeydata.net/js/` and builds its data URLs as `https://api.hockeydata.net/data/ebel/<Service>`. [hd-js]
- Oberliga Süd 2026-27 is division id **21614**. Oberliga Nord is 21610. [deb-ols]
- In this system ESV Kaufbeuren is team id **70199** and Andrew Yogan is player id **26218**. [hd-team]

### Endpoints tested

All are `GET https://api.hockeydata.net/data/ebel/<Service>` with query parameters `apiKey`, `referer`, `lang`, plus the ids shown. All returned HTTP 200 with a JSON body of the form `{"statusId":1,"statusMsg":"Ok","data":{...}}`.

| Service | Extra parameters | Returns |
|---|---|---|
| `GetPlayerDetails` | `divisionId`, `playerId` | Profile (birthdate, height, weight, number, nation, team), season totals, and one row per game played |
| `GetTeamDetails` | `divisionId`, `teamId` | Roster (24 players), every skater's and goalie's season stats, and all 52 games with score, result and team game stats |
| `Schedule` | `divisionId` | All 364 league games: UTC timestamp, teams, score, status, overtime and shootout flags, period scores, venue, live clock |
| `Standings` | `divisionId` | 14 teams: rank, games, wins, overtime wins and losses, losses, goals, points |
| `LeaderFieldPlayers` | `divisionId` | 288 skaters with the same stat columns as the team call |
| `GetGameReport` | `gameId` | One game in full: goals with scorer, assists, time and players on ice; penalties; officials; attendance; live clock |

Not available: `GetPlayerCareerStats` returned 404. The widget library names it, but the service does not exist for this league path. The library also names `GamePlayByPlay`, `GamePlayerStats`, `GameTeamStats` and `GameInfo`, which were not tested. [hd-js]

### Fields that cover the Parity Reference, and more

- Season totals for Yogan: `gamesPlayed` 6, `goals` 2, `assists` 3, `points` 5, `plusMinus` +1, `penaltyMinutes` 2. Also power-play and short-handed splits, game-winning goals, shots, shooting percentage and faceoffs. [hd-player]
- Game log row (4 October v Deggendorf, a 4:3 home win): 1 goal, 1 assist, 2 shots, faceoffs 9/12, plus/minus 0, one minor penalty. The Parity Reference has nothing like this. [hd-player]
- Schedule row: `gameUtcTimestamp`, `scheduledGameStart`, home and away team ids and names, scores, `gameStatus` (0 for not started, 4 for finished in the rows seen), `isOvertime`, `isShootOut`, venue with address. Home or away is given by team id, so the "does the name contain dresden" check goes away. [hd-schedule]
- Live: the schedule response has `containsLiveGames`, and each game has `liveTime`, `liveTimeString` and `liveTimeGamePhase`. No game was live during testing, so the in-progress values were not observed. [hd-schedule]

These figures match the club's own published table for Yogan (6 games, 2 goals, 3 assists, 5 points, +1). [esvk-stats]

### Stability

- It is the federation's production feed: the public site would break if it changed, so it is far steadier than scraped HTML.
- The provider is established and documents its widgets publicly; the docs site carries a copyright line of 2015-2022. The data services themselves are not documented as a public REST API; the URL shapes above come from reading the widget library. [hd-key] [hd-js]
- Ids change by season. The division id is per league per season (21614 is 2026-27 only), so it must be configuration, re-read from DEB's page each autumn. Whether the player and team ids persist across seasons is not verified.
- The widget library's own refresh rules are a good guide to polite polling: default reload every 2 minutes, minimum 10 seconds. [hd-js]
- The server sent `cache-control: private` and `access-control-allow-origin: *`. No rate-limit headers were seen. [hd-schedule]
- The path segment `ebel` is a legacy name inside hockeydata's system (it is the old name of the Austrian league) and is used for DEB's leagues too. [hd-js]

### Permission

- The key is checked against the `referer` **query parameter**, not the HTTP header. With DEB's key and `referer=deb-online.live` the call succeeds; with the same key and no `referer` it returns `{"statusId":4,"statusMsg":"ApiKey invalid"}`. So calling it from our server works technically only by claiming to be DEB's site. [hd-schedule]
- hockeydata's key page says (translated from German): use of the API requires the consent of those responsible for the league, checked when a key is requested. If the API is to be used to build "own statistics portals or statistics applications (mobile or desktop apps)", contact the league or federation directly; only after written confirmation from the league may hockeydata hand out keys. Use on betting or gambling pages is not allowed. The key is restricted to the URL of the requesting website. [hd-key]
- An older copy of the same page on hockeydata's main site says the API is "in principle free and without restriction for every user", with the same two exceptions. The newer docs site drops that sentence. No price is mentioned on either. [hd-key-old]
- The request form asks for name, email, website URL, website title and which leagues. [hd-key]
- DEB's site imprint reserves copyright in its texts, images and logos and forbids copying them for trade or redistribution. It says nothing specific about match data. [deb-imprint]

Reading: a family dashboard showing one player's numbers is small, but it is a "statistics application" in the provider's own words, so the clean route is an email to DEB's league office and then the key form. Team logos and player portraits served by the API are DEB and club property and should not be assumed to come with the data.

## Other sources

### ESV Kaufbeuren club site

- Publishes a season schedule with results and a player stats table as plain server-rendered HTML. [esvk-schedule] [esvk-stats]
- The tables look hand-maintained inside the club's content system: no data provider script is loaded, and the markup is simple table rows. That means they can lag or change shape without notice.
- No kick-off timezone, no game ids, no game log, no live data.
- Useful only as a cross-check.

### HockeyDB

- Player page `pid=106875` still works with a plain request and already shows the row `2026-27 Kaufbeuren ESV GerObL 6 2 3 5 2 1`. [hockeydb-player]
- It shows 2025-26 as Dresden only, 30 games; the Stavanger games are not on it. [hockeydb-player]
- Terms: "Access to hockeydb.com by a web crawler or 'bot with the purpose of capturing the content is expressly prohibited", but also "If you want to post someone's career stats, don't even bother asking -- I'll always say yes to something as trivial as that", with a request for credit and a link back. [hockeydb-usage]
- Reading: showing his career table with credit is welcomed; fetching the page on a timer is the part the owner objects to. Fetch rarely (career rows change once a season) or copy the table by hand.

### Elite Prospects

- The website pages the Parity Reference scrapes still return HTTP 200 to a browser-like request, but the player page text came back as a "Loading page" shell, so the stats are filled in by script and the existing table selectors are unlikely to find them. Not investigated further. [ep-player]
- Its robots file disallows `/ajax/` and `/pro-api/`, the internal JSON paths. [ep-robots]
- Its Terms of Service page is dated 13 June 2018 and, in the text retrieved, has no clause about automated access. [ep-terms]
- It now runs a developer portal offering a REST API: "Start free with 1,000 calls/month. No credit card required", "Access current season for free", with historical depth sold as a one-time purchase. Coverage is advertised as 900+ leagues. [ep-api]
- Not verified: whether the free tier includes the Oberliga, whether career history for one player needs the paid historical add-on, and the API's licence terms for display. No key was requested.

### del-2.org (the league the ticket named)

- The site is server-rendered HTML with assets from its vendor's host `assets.holema.de`. No JSON endpoint was found: `/api` redirects to the home page, and the pages load no data scripts. [del2-home]
- The live page works by reloading itself every 60 seconds. [del2-live]
- Game sheets and rosters are linked as PDFs on the vendor's asset host. [del2-home]
- Its player page for Yogan is stale: it still shows Dresden and 2024-25 as the current season, and credits "www.eliteprospects.com" for the career section. [del2-player]
- The robots file blocks a list of named crawlers and has no rule for generic clients. [del2-robots]
- This was a limited probe (home, live, one player page, imprint, four guessed paths). A private feed behind the league's mobile app was not looked for.

## Not verified

- hockeydata live values during an in-progress game, and the untested game services (`GamePlayByPlay`, `GamePlayerStats`).
- Whether DEB grants consent to a hobby site, how long a key takes, and whether a key is free. No request was sent.
- Whether hockeydata ids for the player and team survive into next season, and what the playoff division id will be (DEB's site links the Oberliga playoffs under a separate division id).
- Elite Prospects API coverage, limits and terms beyond its landing page.
- hockeydata's two documentation sites served an incomplete TLS certificate chain, so they were read with certificate verification off. The data host `api.hockeydata.net` verified normally.
- Whether he is under contract beyond 2026-27; the club's announcement gives no length.

## Sources

- [esvk-signing] ESV Kaufbeuren, "Andrew Yogan belegt die erste Kontingentstelle", 2026-05-07: https://www.esvk.de/news/andrew-yogan-besetzt-die-erste-kontingentstelle.html
- [eisloewen-exit] Dresdner Eislöwen, "Andrew Yogan beendet laufende Saison in Norwegen", 2026-02-06: https://www.eisloewen.de/2026/02/06/andrew-yogan-beendet-laufende-saison-in-norwegen/
- [deb-ols] DEB, Oberliga Süd page (widget markup, key, division ids): https://deb-online.live/liga/herren/oberliga-sued/
- [deb-imprint] DEB site imprint: https://deb-online.live/impressum/
- [hd-js] hockeydata widget library: https://api.hockeydata.net/js/?i18n_de_los&los_icehockey
- [hd-player] `GetPlayerDetails`, tested: `https://api.hockeydata.net/data/ebel/GetPlayerDetails?divisionId=21614&playerId=26218` plus key parameters
- [hd-team] `GetTeamDetails`, tested: `https://api.hockeydata.net/data/ebel/GetTeamDetails?divisionId=21614&teamId=70199` plus key parameters
- [hd-schedule] `Schedule`, `Standings`, `LeaderFieldPlayers`, `GetGameReport`, tested, same host and path
- [hd-key] hockeydata API docs, "API Schlüssel anfordern": https://apidocs.hockeydata.net/api-key/
- [hd-key-old] hockeydata main site, older "API Key" page: https://www.hockeydata.net/softwareloesungen/api/api-key/
- [esvk-schedule] ESV Kaufbeuren schedule: https://www.esvk.de/mannschaft/spielplan.html
- [esvk-stats] ESV Kaufbeuren player stats: https://www.esvk.de/mannschaft/spielerstatistik.html
- [hockeydb-player] HockeyDB, Andrew Yogan: https://www.hockeydb.com/ihdb/stats/pdisplay.php?pid=106875
- [hockeydb-usage] HockeyDB usage terms: https://www.hockeydb.com/copyright.html
- [ep-player] Elite Prospects, Andrew Yogan: https://www.eliteprospects.com/player/13839/andrew-yogan
- [ep-robots] Elite Prospects robots file: https://www.eliteprospects.com/robots.txt
- [ep-terms] Elite Prospects Terms of Service: https://www.eliteprospects.com/terms
- [ep-api] Elite Prospects developer portal: https://developer.eliteprospects.com/
- [del2-home] DEL2 home page: https://www.del-2.org/
- [del2-live] DEL2 live page: https://www.del-2.org/live
- [del2-player] DEL2, Andrew Yogan: https://www.del-2.org/spieler/andrew-yogan_6557
- [del2-robots] DEL2 robots file: https://www.del-2.org/robots.txt
