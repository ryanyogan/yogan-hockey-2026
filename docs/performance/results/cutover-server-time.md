Asked of `main` at http://localhost:5351 and the branch at http://localhost:5361, in turn, 10 times a page, KV never emptied, no throttling, 2026-10-12T19:59:19.681Z. Milliseconds: the median, with the least and the greatest in brackets. Size: kB, gzipped in brackets.

| Page | Headers: `main` cached | Headers: `main` rendered | Headers: branch, KV warm | Headers: branch, KV cold | Whole answer: `main` cached | Whole answer: `main` rendered | Whole answer: branch, KV warm | Whole answer: branch, KV cold | Document: `main` | Document: branch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` |  | 25.0 (23.1 to 32.0) | 13.4 (12.3 to 15.1) |  |  | 25.2 (23.4 to 32.3) | 13.7 (12.6 to 15.4) |  | 127.7 (14.2) | 68.1 (9.1) |
| `/nhl` | 5.1 (4.6 to 7.4) | 19.4 (18.4 to 26.8) | 11.4 (10.6 to 17.3) |  | 5.4 (5.0 to 7.9) | 19.8 (18.7 to 27.1) | 11.7 (10.9 to 17.6) |  | 173.0 (12.9) | 108.7 (10.7) |
| `/nhl?tab=teams` | 6.4 (4.2 to 7.6) | 20.7 (16.2 to 22.6) | 11.9 (9.4 to 13.9) |  | 6.6 (4.3 to 7.8) | 20.9 (16.4 to 22.8) | 12.1 (9.6 to 14.1) |  | 77.2 (10.7) | 61.1 (8.7) |
| `/nhl/live` |  | 28.4 (24.0 to 33.5) | 16.1 (11.6 to 18.1) |  |  | 28.7 (24.6 to 34.1) | 16.5 (11.7 to 18.3) |  | 173.5 (15.7) | 61.0 (8.0) |
| `/nhl/teams/21` | 5.7 (4.4 to 8.6) | 35.5 (29.9 to 46.0) | 21.4 (19.2 to 28.5) |  | 6.2 (4.9 to 9.5) | 36.1 (30.9 to 46.9) | 22.0 (19.6 to 28.8) |  | 353.0 (21.9) | 194.6 (16.8) |
| `/nhl/teams/21/roster` | 5.2 (4.4 to 7.1) | 23.1 (19.2 to 27.1) | 15.1 (13.0 to 21.9) |  | 5.8 (4.7 to 7.8) | 24.2 (19.9 to 28.2) | 15.3 (13.3 to 22.2) |  | 186.3 (16.1) | 92.1 (10.4) |
| `/nhl/teams/21/stats` | 4.4 (4.2 to 6.0) | 18.1 (17.1 to 24.1) | 12.3 (11.3 to 18.2) |  | 4.6 (4.3 to 6.3) | 19.2 (18.1 to 28.6) | 12.4 (11.4 to 18.4) |  | 106.0 (12.6) | 58.7 (8.7) |
| `/nhl/games/401803652` | 5.5 (4.2 to 6.5) | 44.2 (41.2 to 51.1) | 21.5 (18.7 to 26.9) |  | 6.1 (4.7 to 7.4) | 46.2 (42.8 to 53.2) | 21.8 (19.3 to 27.4) |  | 355.1 (33.4) | 287.1 (31.5) |
| `/nhl/games/401803652/scoring` | 5.5 (4.3 to 6.3) | 42.2 (40.8 to 46.4) | 20.3 (18.7 to 29.0) |  | 5.9 (4.9 to 7.1) | 43.6 (41.9 to 47.6) | 20.7 (19.2 to 29.6) |  | 320.9 (32.3) | 252.7 (30.5) |
| `/nhl/games/401803652/pick` | 4.7 (4.2 to 6.0) | 45.2 (40.6 to 105.8) | 22.0 (18.4 to 77.2) |  | 5.1 (4.7 to 6.4) | 46.5 (41.4 to 108.3) | 23.0 (18.8 to 77.7) |  | 315.2 (32.3) | 247.1 (30.5) |
| `/nhl/games/401892449` |  | 29.0 (27.1 to 41.9) | 13.0 (11.9 to 18.3) |  |  | 30.3 (28.1 to 43.5) | 13.2 (12.0 to 18.5) |  | 154.8 (17.5) | 83.7 (12.0) |
| `/players` | 5.7 (4.5 to 6.9) | 17.5 (13.3 to 19.5) | 12.0 (8.7 to 14.3) |  | 5.9 (4.6 to 7.0) | 17.7 (13.5 to 19.7) | 12.1 (8.8 to 14.5) |  | 47.9 (7.6) | 42.8 (7.1) |
| `/players?q=mar` |  | 17.1 (15.0 to 26.7) | 11.1 (9.5 to 14.2) |  |  | 17.3 (15.3 to 26.9) | 11.3 (9.7 to 14.4) |  | 69.5 (10.2) | 61.1 (8.4) |
| `/players/4024123` | 4.6 (4.3 to 6.0) | 20.2 (18.5 to 25.8) | 12.0 (11.0 to 16.4) |  | 5.0 (4.6 to 6.5) | 21.6 (20.0 to 26.4) | 12.2 (11.1 to 16.6) |  | 175.3 (14.9) | 94.9 (10.7) |
| `/players/4024123/games` | 4.6 (4.0 to 6.4) | 20.5 (18.9 to 22.8) | 11.5 (10.7 to 15.7) |  | 5.1 (4.4 to 6.9) | 21.8 (19.8 to 23.6) | 11.7 (10.9 to 16.0) |  | 175.6 (15.0) | 95.0 (10.7) |
| `/players/3067313` | 4.7 (4.0 to 6.7) | 19.8 (18.0 to 26.5) | 10.9 (10.4 to 15.2) |  | 4.9 (4.2 to 7.0) | 20.8 (18.5 to 27.6) | 11.1 (10.5 to 15.4) |  | 160.6 (14.5) | 88.9 (10.5) |
| `/no-such-page` |  | 18.8 (17.4 to 20.8) | 8.8 (8.1 to 10.3) |  |  | 18.9 (17.6 to 21.0) | 9.0 (8.2 to 10.6) |  | 90.0 (10.7) | 41.1 (6.5) |

What answered (status, and `main`'s `x-page-cache`):

- `/`: main cached not kept; main rendered 200; branch 200
- `/nhl`: main cached 200 hit; main rendered 200 bypass; branch 200
- `/nhl?tab=teams`: main cached 200 hit; main rendered 200 bypass; branch 200
- `/nhl/live`: main cached not kept; main rendered 200; branch 200
- `/nhl/teams/21`: main cached 200 hit; main rendered 200 bypass; branch 200
- `/nhl/teams/21/roster`: main cached 200 hit; main rendered 200 bypass; branch 200
- `/nhl/teams/21/stats`: main cached 200 hit; main rendered 200 bypass; branch 200
- `/nhl/games/401803652`: main cached 200 hit; main rendered 200 bypass; branch 200
- `/nhl/games/401803652/scoring`: main cached 200 hit; main rendered 200 bypass; branch 200
- `/nhl/games/401803652/pick`: main cached 200 hit; main rendered 200 bypass; branch 200
- `/nhl/games/401892449`: main cached not kept; main rendered 200 miss; branch 200
- `/players`: main cached 200 hit; main rendered 200 bypass; branch 200
- `/players?q=mar`: main cached not kept; main rendered 200 bypass; branch 200
- `/players/4024123`: main cached 200 hit; main rendered 200 bypass; branch 200
- `/players/4024123/games`: main cached 200 hit; main rendered 200 bypass; branch 200
- `/players/3067313`: main cached 200 hit; main rendered 200 bypass; branch 200
- `/no-such-page`: main cached not kept; main rendered 404; branch 404

