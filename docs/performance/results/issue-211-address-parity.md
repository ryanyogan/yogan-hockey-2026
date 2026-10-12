160 addresses asked of `main` (http://localhost:5430) and the branch (http://localhost:5440), redirects not followed: 157 answer with the same status and `location`, 0 differ, 3 differ as intended.

## Differences in status or `location`

| Part | Address | `main` | Branch | `main`'s title | Branch's title | |
| --- | --- | --- | --- | --- | --- | --- |
| sample pages | `GET /skeleton/loading` | 200 | 404 | Loading states · Yogan Hockey | Not found · Yogan Hockey | **intended** |
| vinext's own | `GET /nhl.rsc` | 200 | 404 |  | Not found · Yogan Hockey | **intended** |
| vinext's own | `GET /nhl/teams/21.rsc?tab=roster` | 308 → `/nhl/teams/21/roster?tab=roster` | 308 → `/nhl/teams/21.rsc/roster?tab=roster` |  |  | **intended** |

- `/skeleton/loading`: The page of placeholders is gone on purpose: nothing draws a placeholder now (#192).
- `/nhl.rsc`: vinext's transport for a navigation, not an address of the site: TanStack Start asks /_serverFn/* instead.
- `/nhl/teams/21.rsc?tab=roster`: The 308 of an old link asked for over vinext's transport, which is gone with it.

## Differences reported, not failed

- `GET /nhl/games/401803652`: title: 1st 2:58 Michael Bunting Wrist Shot saved by Colten Ellis on main, DAL at BUF · Yogan Hockey on the branch
- `GET /nhl/games/401803652/scoring`: title: 1st 2:58 Michael Bunting Wrist Shot saved by Colten Ellis on main, DAL at BUF · Yogan Hockey on the branch
- `GET /nhl/games/401803652/pick`: title: 1st 2:58 Michael Bunting Wrist Shot saved by Colten Ellis on main, DAL at BUF · Yogan Hockey on the branch
- `GET /skeleton/loading`: title: Loading states · Yogan Hockey on main, Not found · Yogan Hockey on the branch
- `OPTIONS /picks`: allow: GET, HEAD, OPTIONS on main, none on the branch
- `GET /_headers`: title: none on main, Not found · Yogan Hockey on the branch; type: none on main, text/html on the branch
- `GET /nhl/teams/999`: title: none on main, Not answering · Yogan Hockey on the branch
- `GET /nhl/teams/1`: title: none on main, Not answering · Yogan Hockey on the branch
- `GET /nhl/teams/leafs/coaches`: title: Not found · Yogan Hockey on main, Team not found · Yogan Hockey on the branch
- `GET /players/abc/career`: title: Not found · Yogan Hockey on main, Player not found · Yogan Hockey on the branch
- `GET /nhl/games/401803652?tab=plays`: title: 1st 2:58 Michael Bunting Wrist Shot saved by Colten Ellis on main, DAL at BUF · Yogan Hockey on the branch
- `GET /nhl/games/401803652?tab=bogus`: title: 1st 2:58 Michael Bunting Wrist Shot saved by Colten Ellis on main, DAL at BUF · Yogan Hockey on the branch
- `GET /nhl/games/401803652?tab=scoring&tab=pick`: title: 1st 2:58 Michael Bunting Wrist Shot saved by Colten Ellis on main, DAL at BUF · Yogan Hockey on the branch
- `GET /nhl/games/401803652/scoring?tab=pick`: title: 1st 2:58 Michael Bunting Wrist Shot saved by Colten Ellis on main, DAL at BUF · Yogan Hockey on the branch
- `GET /nhl/games/401803652?utm_source=a`: title: 1st 2:58 Michael Bunting Wrist Shot saved by Colten Ellis on main, DAL at BUF · Yogan Hockey on the branch
- `GET /nhl.rsc`: title: none on main, Not found · Yogan Hockey on the branch; type: text/x-component on main, text/html on the branch

## Every address

| Part | Address | `main` | Branch | `main`'s title | Branch's title | |
| --- | --- | --- | --- | --- | --- | --- |
| pages | `GET /` | 200 | 200 | Yogan Hockey | Yogan Hockey |  |
| pages | `GET /nhl` | 200 | 200 | NHL standings · Yogan Hockey | NHL standings · Yogan Hockey |  |
| pages | `GET /nhl?tab=teams` | 200 | 200 | NHL teams · Yogan Hockey | NHL teams · Yogan Hockey |  |
| pages | `GET /nhl?tab=standings` | 200 | 200 | NHL standings · Yogan Hockey | NHL standings · Yogan Hockey |  |
| pages | `GET /nhl?view=division` | 200 | 200 | NHL standings · Yogan Hockey | NHL standings · Yogan Hockey |  |
| pages | `GET /nhl?view=conference` | 200 | 200 | NHL standings · Yogan Hockey | NHL standings · Yogan Hockey |  |
| pages | `GET /nhl?view=wildcard` | 200 | 200 | NHL standings · Yogan Hockey | NHL standings · Yogan Hockey |  |
| pages | `GET /nhl?view=league` | 200 | 200 | NHL standings · Yogan Hockey | NHL standings · Yogan Hockey |  |
| pages | `GET /nhl/live` | 200 | 200 | Live Scores · Yogan Hockey | Live Scores · Yogan Hockey |  |
| pages | `GET /nhl/teams/21` | 200 | 200 | Toronto Maple Leafs · Yogan Hockey | Toronto Maple Leafs · Yogan Hockey |  |
| pages | `GET /nhl/teams/21/roster` | 200 | 200 | Toronto Maple Leafs · Yogan Hockey | Toronto Maple Leafs · Yogan Hockey |  |
| pages | `GET /nhl/teams/21/stats` | 200 | 200 | Toronto Maple Leafs · Yogan Hockey | Toronto Maple Leafs · Yogan Hockey |  |
| pages | `GET /nhl/games/401803652` | 200 | 200 | 1st 2:58 Michael Bunting Wrist Shot saved by Colten Ellis | DAL at BUF · Yogan Hockey |  |
| pages | `GET /nhl/games/401803652/scoring` | 200 | 200 | 1st 2:58 Michael Bunting Wrist Shot saved by Colten Ellis | DAL at BUF · Yogan Hockey |  |
| pages | `GET /nhl/games/401803652/pick` | 200 | 200 | 1st 2:58 Michael Bunting Wrist Shot saved by Colten Ellis | DAL at BUF · Yogan Hockey |  |
| pages | `GET /nhl/games/401892449` | 200 | 200 | NSH at TOR · Yogan Hockey | NSH at TOR · Yogan Hockey |  |
| pages | `GET /nhl/games/401892449/scoring` | 200 | 200 | NSH at TOR · Yogan Hockey | NSH at TOR · Yogan Hockey |  |
| pages | `GET /nhl/games/401892449/pick` | 200 | 200 | NSH at TOR · Yogan Hockey | NSH at TOR · Yogan Hockey |  |
| pages | `GET /players` | 200 | 200 | Players · Yogan Hockey | Players · Yogan Hockey |  |
| pages | `GET /players?q=mar` | 200 | 200 | Players · Yogan Hockey | Players · Yogan Hockey |  |
| pages | `GET /players/4024123` | 200 | 200 | Auston Matthews · Yogan Hockey | Auston Matthews · Yogan Hockey |  |
| pages | `GET /players/4024123/games` | 200 | 200 | Auston Matthews · Yogan Hockey | Auston Matthews · Yogan Hockey |  |
| pages | `GET /players/3067313` | 200 | 200 | Anthony Stolarz · Yogan Hockey | Anthony Stolarz · Yogan Hockey |  |
| pages | `GET /players/3067313/games` | 200 | 200 | Anthony Stolarz · Yogan Hockey | Anthony Stolarz · Yogan Hockey |  |
| sample pages | `GET /skeleton` | 200 | 200 | Walking skeleton · Yogan Hockey | Walking skeleton · Yogan Hockey |  |
| sample pages | `GET /skeleton/dashboard` | 200 | 200 | Sample dashboard · Yogan Hockey | Sample dashboard · Yogan Hockey |  |
| sample pages | `GET /skeleton/live` | 200 | 200 | Sample live scores · Yogan Hockey | Sample live scores · Yogan Hockey |  |
| sample pages | `GET /skeleton/picks` | 200 | 200 | Sample picks · Yogan Hockey | Sample picks · Yogan Hockey |  |
| sample pages | `GET /skeleton/loading` | 200 | 404 | Loading states · Yogan Hockey | Not found · Yogan Hockey | **intended** |
| /picks | `GET /picks` | 200 | 200 |  |  |  |
| /picks | `HEAD /picks` | 200 | 200 |  |  |  |
| /picks | `POST /picks` | 405 | 405 |  |  |  |
| /picks | `PUT /picks` | 405 | 405 |  |  |  |
| /picks | `PATCH /picks` | 405 | 405 |  |  |  |
| /picks | `DELETE /picks` | 405 | 405 |  |  |  |
| /picks | `OPTIONS /picks` | 204 | 204 |  |  |  |
| files | `GET /manifest.webmanifest` | 200 | 200 |  |  |  |
| files | `GET /favicon.ico` | 200 | 200 |  |  |  |
| files | `GET /robots.txt` | 404 | 404 | Not found · Yogan Hockey | Not found · Yogan Hockey |  |
| files | `GET /sitemap.xml` | 404 | 404 | Not found · Yogan Hockey | Not found · Yogan Hockey |  |
| files | `GET /icons/pwa-64x64.png` | 200 | 200 |  |  |  |
| files | `GET /icons/pwa-192x192.png` | 200 | 200 |  |  |  |
| files | `GET /icons/pwa-512x512.png` | 200 | 200 |  |  |  |
| files | `GET /icons/maskable-icon-192x192.png` | 200 | 200 |  |  |  |
| files | `GET /icons/maskable-icon-512x512.png` | 200 | 200 |  |  |  |
| files | `GET /icons/apple-touch-icon-180x180.png` | 200 | 200 |  |  |  |
| files | `GET /icons/apple-splash-portrait-light-1170x2532.png` | 200 | 200 |  |  |  |
| files | `GET /icons/apple-splash-portrait-dark-1170x2532.png` | 200 | 200 |  |  |  |
| files | `GET /icons/no-such-icon.png` | 404 | 404 | Not found · Yogan Hockey | Not found · Yogan Hockey |  |
| files | `GET /apple-touch-icon.png` | 404 | 404 | Not found · Yogan Hockey | Not found · Yogan Hockey |  |
| files | `GET /team-marks/10-28.2288c70a.webp` | 200 | 200 |  |  |  |
| files | `GET /team-marks/no-such-mark.webp` | 404 | 404 | Not found · Yogan Hockey | Not found · Yogan Hockey |  |
| files | `GET /_headers` | 404 | 404 |  | Not found · Yogan Hockey |  |
| files | `GET /sw.js` | 404 | 404 | Not found · Yogan Hockey | Not found · Yogan Hockey |  |
| unknown ids | `GET /nhl/teams/999` | 503 | 503 |  | Not answering · Yogan Hockey |  |
| unknown ids | `GET /nhl/teams/1` | 503 | 503 |  | Not answering · Yogan Hockey |  |
| unknown ids | `GET /nhl/games/1` | 200 | 200 | Game · Yogan Hockey | Game · Yogan Hockey |  |
| unknown ids | `GET /nhl/games/401891815` | 200 | 200 | Game · Yogan Hockey | Game · Yogan Hockey |  |
| unknown ids | `GET /nhl/games/401891815/scoring` | 200 | 200 | Game · Yogan Hockey | Game · Yogan Hockey |  |
| unknown ids | `GET /nhl/games/401891815/pick` | 200 | 200 | Game · Yogan Hockey | Game · Yogan Hockey |  |
| unknown ids | `GET /players/1` | 503 | 503 | Not answering · Yogan Hockey | Not answering · Yogan Hockey |  |
| unknown ids | `GET /players/1/games` | 503 | 503 | Not answering · Yogan Hockey | Not answering · Yogan Hockey |  |
| unknown ids | `GET /players?q=zzzz` | 200 | 200 | Players · Yogan Hockey | Players · Yogan Hockey |  |
| unknown ids | `GET /players?q=` | 200 | 200 | Players · Yogan Hockey | Players · Yogan Hockey |  |
| ids that are not numbers | `GET /nhl/teams/leafs` | 404 | 404 | Team not found · Yogan Hockey | Team not found · Yogan Hockey |  |
| ids that are not numbers | `GET /nhl/teams/leafs/roster` | 404 | 404 | Team not found · Yogan Hockey | Team not found · Yogan Hockey |  |
| ids that are not numbers | `GET /nhl/games/abc` | 404 | 404 | Game not found · Yogan Hockey | Game not found · Yogan Hockey |  |
| ids that are not numbers | `GET /nhl/games/abc/scoring` | 404 | 404 | Game not found · Yogan Hockey | Game not found · Yogan Hockey |  |
| ids that are not numbers | `GET /players/abc` | 404 | 404 | Player not found · Yogan Hockey | Player not found · Yogan Hockey |  |
| ids that are not numbers | `GET /players/abc/games` | 404 | 404 | Player not found · Yogan Hockey | Player not found · Yogan Hockey |  |
| ids that are not numbers | `GET /players/rylan-yogan` | 404 | 404 | Player not found · Yogan Hockey | Player not found · Yogan Hockey |  |
| ids that are not numbers | `GET /players/easter-egg-rylan-yogan` | 404 | 404 | Player not found · Yogan Hockey | Player not found · Yogan Hockey |  |
| ids that are not numbers | `GET /nhl/teams/21abc` | 404 | 404 | Team not found · Yogan Hockey | Team not found · Yogan Hockey |  |
| ids that are not numbers | `GET /nhl/teams/-1` | 404 | 404 | Team not found · Yogan Hockey | Team not found · Yogan Hockey |  |
| ids that are not numbers | `GET /nhl/teams/%20` | 404 | 404 | Team not found · Yogan Hockey | Team not found · Yogan Hockey |  |
| ids that are not numbers | `GET /nhl/teams/21%20` | 404 | 404 | Team not found · Yogan Hockey | Team not found · Yogan Hockey |  |
| ids that are not numbers | `GET /players/4024123%20` | 404 | 404 | Player not found · Yogan Hockey | Player not found · Yogan Hockey |  |
| ids that are not numbers | `GET /nhl/games/401803652%20` | 404 | 404 | Game not found · Yogan Hockey | Game not found · Yogan Hockey |  |
| ids that are not numbers | `GET /nhl%20` | 404 | 404 | Not found · Yogan Hockey | Not found · Yogan Hockey |  |
| unknown paths | `GET /no-such-page` | 404 | 404 | Not found · Yogan Hockey | Not found · Yogan Hockey |  |
| unknown paths | `GET /nhl/standings` | 404 | 404 | Not found · Yogan Hockey | Not found · Yogan Hockey |  |
| unknown paths | `GET /nhl/teams` | 404 | 404 | Not found · Yogan Hockey | Not found · Yogan Hockey |  |
| unknown paths | `GET /nhl/games` | 404 | 404 | Not found · Yogan Hockey | Not found · Yogan Hockey |  |
| unknown paths | `GET /nhl/teams/21/coaches` | 404 | 404 | Not found · Yogan Hockey | Not found · Yogan Hockey |  |
| unknown paths | `GET /nhl/teams/21/roster/more` | 404 | 404 | Not found · Yogan Hockey | Not found · Yogan Hockey |  |
| unknown paths | `GET /nhl/teams/leafs/coaches` | 404 | 404 | Not found · Yogan Hockey | Team not found · Yogan Hockey |  |
| unknown paths | `GET /nhl/games/401803652/box` | 404 | 404 | Not found · Yogan Hockey | Not found · Yogan Hockey |  |
| unknown paths | `GET /nhl/games/401803652/scoring/more` | 404 | 404 | Not found · Yogan Hockey | Not found · Yogan Hockey |  |
| unknown paths | `GET /players/4024123/career` | 404 | 404 | Not found · Yogan Hockey | Not found · Yogan Hockey |  |
| unknown paths | `GET /players/4024123/games/more` | 404 | 404 | Not found · Yogan Hockey | Not found · Yogan Hockey |  |
| unknown paths | `GET /players/abc/career` | 404 | 404 | Not found · Yogan Hockey | Player not found · Yogan Hockey |  |
| unknown paths | `GET /skeleton/nope` | 404 | 404 | Not found · Yogan Hockey | Not found · Yogan Hockey |  |
| unknown paths | `GET /family/rylan` | 404 | 404 | Not found · Yogan Hockey | Not found · Yogan Hockey |  |
| unknown paths | `GET /yogan` | 404 | 404 | Not found · Yogan Hockey | Not found · Yogan Hockey |  |
| unknown paths | `GET /NHL` | 404 | 404 | Not found · Yogan Hockey | Not found · Yogan Hockey |  |
| unknown paths | `GET /Players` | 404 | 404 | Not found · Yogan Hockey | Not found · Yogan Hockey |  |
| unknown paths | `GET /nhl/Live` | 404 | 404 | Not found · Yogan Hockey | Not found · Yogan Hockey |  |
| unknown paths | `GET /PICKS` | 404 | 404 | Not found · Yogan Hockey | Not found · Yogan Hockey |  |
| unknown paths | `GET /nhl/teams/21/Roster` | 404 | 404 | Not found · Yogan Hockey | Not found · Yogan Hockey |  |
| unknown paths | `GET /picks/more` | 404 | 404 | Not found · Yogan Hockey | Not found · Yogan Hockey |  |
| old links | `GET /nhl/teams/21?tab=roster` | 308 → `/nhl/teams/21/roster?tab=roster` | 308 → `/nhl/teams/21/roster?tab=roster` |  |  |  |
| old links | `GET /nhl/teams/21?tab=stats` | 308 → `/nhl/teams/21/stats?tab=stats` | 308 → `/nhl/teams/21/stats?tab=stats` |  |  |  |
| old links | `GET /nhl/teams/21?tab=schedule` | 200 | 200 | Toronto Maple Leafs · Yogan Hockey | Toronto Maple Leafs · Yogan Hockey |  |
| old links | `GET /nhl/teams/21?tab=bogus` | 200 | 200 | Toronto Maple Leafs · Yogan Hockey | Toronto Maple Leafs · Yogan Hockey |  |
| old links | `GET /nhl/teams/21?tab=roster&x=1` | 308 → `/nhl/teams/21/roster?tab=roster&x=1` | 308 → `/nhl/teams/21/roster?tab=roster&x=1` |  |  |  |
| old links | `GET /nhl/teams/21/roster?tab=stats` | 200 | 200 | Toronto Maple Leafs · Yogan Hockey | Toronto Maple Leafs · Yogan Hockey |  |
| old links | `GET /nhl/teams/leafs?tab=roster` | 308 → `/nhl/teams/leafs/roster?tab=roster` | 308 → `/nhl/teams/leafs/roster?tab=roster` |  |  |  |
| old links | `GET /nhl/games/401803652?tab=scoring` | 308 → `/nhl/games/401803652/scoring` | 308 → `/nhl/games/401803652/scoring` |  |  |  |
| old links | `GET /nhl/games/401803652?tab=pick` | 308 → `/nhl/games/401803652/pick` | 308 → `/nhl/games/401803652/pick` |  |  |  |
| old links | `GET /nhl/games/401803652?tab=plays` | 200 | 200 | 1st 2:58 Michael Bunting Wrist Shot saved by Colten Ellis | DAL at BUF · Yogan Hockey |  |
| old links | `GET /nhl/games/401803652?tab=bogus` | 200 | 200 | 1st 2:58 Michael Bunting Wrist Shot saved by Colten Ellis | DAL at BUF · Yogan Hockey |  |
| old links | `GET /nhl/games/401803652?tab=scoring&x=1` | 308 → `/nhl/games/401803652/scoring?x=1` | 308 → `/nhl/games/401803652/scoring?x=1` |  |  |  |
| old links | `GET /nhl/games/401803652?tab=scoring&tab=pick` | 200 | 200 | 1st 2:58 Michael Bunting Wrist Shot saved by Colten Ellis | DAL at BUF · Yogan Hockey |  |
| old links | `GET /nhl/games/401803652/scoring?tab=pick` | 200 | 200 | 1st 2:58 Michael Bunting Wrist Shot saved by Colten Ellis | DAL at BUF · Yogan Hockey |  |
| old links | `GET /nhl/games/abc?tab=scoring` | 308 → `/nhl/games/abc/scoring` | 308 → `/nhl/games/abc/scoring` |  |  |  |
| old links | `GET /players/4024123?games=all` | 308 → `/players/4024123/games` | 308 → `/players/4024123/games` |  |  |  |
| old links | `GET /players/4024123?games=all&x=1` | 308 → `/players/4024123/games?x=1` | 308 → `/players/4024123/games?x=1` |  |  |  |
| old links | `GET /players/4024123?games=some` | 200 | 200 | Auston Matthews · Yogan Hockey | Auston Matthews · Yogan Hockey |  |
| old links | `GET /players/4024123/games?games=all` | 200 | 200 | Auston Matthews · Yogan Hockey | Auston Matthews · Yogan Hockey |  |
| old links | `GET /players/abc?games=all` | 308 → `/players/abc/games` | 308 → `/players/abc/games` |  |  |  |
| trailing slashes | `GET /nhl/` | 308 → `/nhl` | 308 → `/nhl` |  |  |  |
| trailing slashes | `GET /nhl/live/` | 308 → `/nhl/live` | 308 → `/nhl/live` |  |  |  |
| trailing slashes | `GET /nhl/teams/21/` | 308 → `/nhl/teams/21` | 308 → `/nhl/teams/21` |  |  |  |
| trailing slashes | `GET /nhl/teams/21/roster/` | 308 → `/nhl/teams/21/roster` | 308 → `/nhl/teams/21/roster` |  |  |  |
| trailing slashes | `GET /nhl/games/401803652/` | 308 → `/nhl/games/401803652` | 308 → `/nhl/games/401803652` |  |  |  |
| trailing slashes | `GET /players/` | 308 → `/players` | 308 → `/players` |  |  |  |
| trailing slashes | `GET /players/4024123/` | 308 → `/players/4024123` | 308 → `/players/4024123` |  |  |  |
| trailing slashes | `GET /picks/` | 308 → `/picks` | 308 → `/picks` |  |  |  |
| trailing slashes | `GET /skeleton/` | 308 → `/skeleton` | 308 → `/skeleton` |  |  |  |
| trailing slashes | `GET /no-such-page/` | 308 → `/no-such-page` | 308 → `/no-such-page` |  |  |  |
| trailing slashes | `GET /nhl/?x=1` | 308 → `/nhl?x=1` | 308 → `/nhl?x=1` |  |  |  |
| trailing slashes | `GET /nhl//` | 308 → `/nhl` | 308 → `/nhl` |  |  |  |
| trailing slashes | `GET /nhl/teams/21/?tab=roster` | 308 → `/nhl/teams/21?tab=roster` | 308 → `/nhl/teams/21?tab=roster` |  |  |  |
| trailing slashes | `GET /nhl/teams/%20/` | 308 → `/nhl/teams/%20` | 308 → `/nhl/teams/%20` |  |  |  |
| trailing slashes | `POST /nhl/` | 308 → `/nhl` | 308 → `/nhl` |  |  |  |
| search parameters no page reads | `GET /?x=1` | 200 | 200 | Yogan Hockey | Yogan Hockey |  |
| search parameters no page reads | `GET /nhl?x=1` | 200 | 200 | NHL standings · Yogan Hockey | NHL standings · Yogan Hockey |  |
| search parameters no page reads | `GET /nhl?tab=bogus` | 200 | 200 | NHL standings · Yogan Hockey | NHL standings · Yogan Hockey |  |
| search parameters no page reads | `GET /nhl?view=bogus` | 200 | 200 | NHL standings · Yogan Hockey | NHL standings · Yogan Hockey |  |
| search parameters no page reads | `GET /nhl?tab=teams&view=league` | 200 | 200 | NHL teams · Yogan Hockey | NHL teams · Yogan Hockey |  |
| search parameters no page reads | `GET /nhl/live?x=1` | 200 | 200 | Live Scores · Yogan Hockey | Live Scores · Yogan Hockey |  |
| search parameters no page reads | `GET /nhl/teams/21?x=1` | 200 | 200 | Toronto Maple Leafs · Yogan Hockey | Toronto Maple Leafs · Yogan Hockey |  |
| search parameters no page reads | `GET /nhl/teams/21/roster?x=1` | 200 | 200 | Toronto Maple Leafs · Yogan Hockey | Toronto Maple Leafs · Yogan Hockey |  |
| search parameters no page reads | `GET /nhl/games/401803652?utm_source=a` | 200 | 200 | 1st 2:58 Michael Bunting Wrist Shot saved by Colten Ellis | DAL at BUF · Yogan Hockey |  |
| search parameters no page reads | `GET /players?x=1` | 200 | 200 | Players · Yogan Hockey | Players · Yogan Hockey |  |
| search parameters no page reads | `GET /players?q=mar&x=1` | 200 | 200 | Players · Yogan Hockey | Players · Yogan Hockey |  |
| search parameters no page reads | `GET /players/4024123?x=1` | 200 | 200 | Auston Matthews · Yogan Hockey | Auston Matthews · Yogan Hockey |  |
| search parameters no page reads | `GET /picks?x=1` | 200 | 200 |  |  |  |
| search parameters no page reads | `GET /manifest.webmanifest?x=1` | 200 | 200 |  |  |  |
| /agents/* | `GET /agents/scoreboard-agent/main` | 404 | 404 |  |  |  |
| /agents/* | `GET /agents/game-agent/401803652` | 404 | 404 |  |  |  |
| /agents/* | `GET /agents/skeleton-agent/skeleton` | 404 | 404 |  |  |  |
| /agents/* | `GET /agents/no-such-agent/main` | 400 | 400 |  |  |  |
| /agents/* | `GET /agents/scoreboard-agent` | 404 | 404 |  |  |  |
| /agents/* | `GET /agents/` | 404 | 404 |  |  |  |
| /agents/* | `GET /agents` | 404 | 404 | Not found · Yogan Hockey | Not found · Yogan Hockey |  |
| other methods on a page | `HEAD /nhl` | 200 | 200 |  |  |  |
| other methods on a page | `POST /nhl` | 200 | 200 | NHL standings · Yogan Hockey | NHL standings · Yogan Hockey |  |
| vinext's own | `GET /nhl.rsc` | 200 | 404 |  | Not found · Yogan Hockey | **intended** |
| vinext's own | `GET /nhl/teams/21.rsc?tab=roster` | 308 → `/nhl/teams/21/roster?tab=roster` | 308 → `/nhl/teams/21.rsc/roster?tab=roster` |  |  | **intended** |

