# The approved look in production (#138)

Ryan approved the tuned ledger prototype in #129 on 2026-10-11. He named no typeface, so its opening recommendation stands: Geist Mono at the Medium treatment (500 body, 700 bold). [tuned-ledger.md](tuned-ledger.md) describes the prototype and holds its screenshots; this page records how production was brought to it and what was measured.

## What changed

- **Colours**: secondary text is three solid colours a theme (`text-note`, `text-label`, `text-aside`) in place of the foreground at an opacity, and the rules are the prototype's three (`border-border` under a row, `border-rule-head` under a column header, `border-rule` framing the shell). The live red, the live tint and the highlight are the prototype's too.
- **Type**: Geist Mono at 500, with 400 for asides and counts and 700 for titles, winners and scores. 13px on a 20px line, 11px labels and 16px scores at a desk; 15px on 22, 12px labels and 20px scores on a phone (below 768px).
- **Spacing**: the one scale, 4, 8, 12, 16, 24, 32 and 48px. A one-line ledger row is 33px at a desk and 45px on a phone in every table (the "compact" density is gone), a game row on a phone 55px, the score strip 36 and 56px. A row with a second line under its value is taller by that line: a favorite player's on a phone is 61px, and a team's record row 67px where its standing wraps.
- **Phone targets that are type and spacing**: every ledger row, every tab (a ruled strip of 44px cells), the top bar's button, a favorite's heart and a header link's reach. The bottom tab bar came with #139 ([tab-bar/](tab-bar/README.md)), which also brought every remaining link and button to 44px; the 390px shots here still show the menu it replaced until they are next retaken.

All of it is in `packages/ui/src/theme.css` and the components beside it.

## Screenshots

[approved-look/](approved-look/), taken by `node scripts/look-shots.mjs http://localhost:<PORT> docs/design/approved-look` against a dev server in fixture mode: 18 pages at 390px (2x) and 1440px, light and dark, 72 shots. `manifest.json` records for each the theme shown, the font, the type sizes, the row, tab and strip heights, sideways overflow (none) and browser errors (none but the failed read the error page is about).

| Page | File prefix | Compared against |
| --- | --- | --- |
| Home | `home` | `tuned-ledger/home-*` |
| Standings | `standings` | `tuned-ledger/standings-*` |
| A game (the Replay of a final; plays, scoring, the pick) | `game`, `game-scoring`, `game-pick` | `tuned-ledger/game-*` |
| A game still to come | `game-scheduled` | extends the prototype |
| Scores, and the sample slate with games in progress | `scores`, `sample-live` | the prototype's Home ledger and strip |
| Teams, a team (schedule, roster, stats) | `teams`, `team`, `roster`, `stats` | extends the prototype |
| Players, a player (latest and all games) | `players`, `player`, `player-games` | extends the prototype |
| Not found, a failed read | `not-found`, `error` | extends the prototype |
| Every route's placeholders | `sample-loading` | the same geometry as what replaces them |

The recorded fixtures are a slate still to be played, so Home's rows carry no scores; the live tint, the red marker and a losing score stepped back are on `sample-live`.

### Measured side by side

`node scripts/look-compare.mjs http://localhost:<prototype> http://localhost:<site> docs/design/approved-look/compare.json` opens the prototype and the site at the same width and theme and measures the same parts of each: the score strip, its label and a game in it, the page's column, a section's header, title and count, a column header, a ledger row, a cell and a team's mark, the footer, the sidebar, a sidebar link, the wordmark, a tab, and on the game page the timeline and a play's row. For each it compares where it is and how large (leaving out what depends on the words in it) and its computed typeface, size, weight, line, tracking, colour, rule and padding. Home, Standings and the game page, at 390 and 1440px, light and dark: **160 measurements, none differing** by more than half a pixel or in any style. On Home and Standings, where both draw the same number of rows, the footer starts at the same pixel, so the whole page is the same height.

| At 1440px on Home (prototype and site alike) | |
| --- | --- |
| Score strip | 36px high from the top of the column at x 193 |
| "TONIGHT" | x 217, y 60, 13px on 20, weight 700 |
| Column headers | y 88, 11px on 16, weight 500, `#57534e` |
| First game row | x 217, y 112.5, 1199 by 33px, 13px on 20, weight 500 |
| A team's mark | 15.6px square |
| A sidebar link | 160 by 28px |

| At 390px on Home (prototype and site alike) | |
| --- | --- |
| Score strip | 56px high under the 44px top bar; a game's cell 88px, 13px on 18 |
| "TONIGHT" | x 16, y 116, 15px on 22, weight 700 |
| Column headers | y 168, 12px on 16 |
| First game row | y 192.5, 358 by 55px, 15px on 22 |
| A team's mark | 18px square |
| Footer | starts at y 1762, 73px high |

A standings row is 45px on a phone and 33px at a desk in both, and a tab on a phone 44px.

Placeholders are built from the ledger's own parts, so they changed with it: a slate's placeholder row is 55px on a phone and 33px at a desk, every other 45 and 33px, as the rows that replace them.

## Contrast

Read from the rendered pages (`approved-look/contrast.json`: the computed colour of an element that draws each role, on Home and on the sample slate, at whichever of the two widths draws it: the note column is a desk's, and the red marker is on the sample slate, Home's recorded games being still to come), beside the prototype's recorded values. Every pair is the same colour and the same ratio.

| Theme | Use | Prototype | Ratio | Production | Ratio |
| --- | --- | --- | ---: | --- | ---: |
| light | Body text, scores | `#171717` | 17.18 | `#171717` | 17.18 |
| light | Notes, idle links, second lines | `#44403c` | 9.84 | `#44403c` | 9.84 |
| light | Column headers, counts | `#57534e` | 7.31 | `#57534e` | 7.31 |
| light | Asides: records, ranks, footer | `#6b6660` | 5.45 | `#6b6660` | 5.45 |
| light | Live marker | `#c81e1e` | 5.50 | `#c81e1e` | 5.50 |
| light | Rule under a row | `#c9c5bc` | 1.65 | `#c9c5bc` | 1.65 |
| light | Rule under a column header | `#8a857c` | 3.51 | `#8a857c` | 3.51 |
| light | Rules framing the shell | `#8a857c` | 3.51 | `#8a857c` | 3.51 |
| light | Body text on a live row | `#171717` | 15.69 | `#171717` | 15.69 |
| light | Asides on a live row | `#6b6660` | 4.97 | `#6b6660` | 4.97 |
| dark | Body text, scores | `#f1f5f9` | 16.30 | `#f1f5f9` | 16.30 |
| dark | Notes, idle links, second lines | `#cbd5e1` | 12.02 | `#cbd5e1` | 12.02 |
| dark | Column headers, counts | `#a9b6c8` | 8.68 | `#a9b6c8` | 8.68 |
| dark | Asides: records, ranks, footer | `#94a3b8` | 6.96 | `#94a3b8` | 6.96 |
| dark | Live marker | `#f87171` | 6.45 | `#f87171` | 6.45 |
| dark | Rule under a row | `#3b4a61` | 1.99 | `#3b4a61` | 1.99 |
| dark | Rule under a column header | `#64748b` | 3.75 | `#64748b` | 3.75 |
| dark | Rules framing the shell | `#64748b` | 3.75 | `#64748b` | 3.75 |
| dark | Body text on a live row | `#f1f5f9` | 13.77 | `#f1f5f9` | 13.77 |
| dark | Asides on a live row | `#94a3b8` | 5.88 | `#94a3b8` | 5.88 |

## The font

Geist Mono is one variable file holding every weight, downloaded by vinext at build time and served from the site's own origin (`/_next/static/_vinext_fonts/...woff2`, 1 file for Latin text); the page's head preloads it and its `@font-face` is inline, `font-display: swap`. Until it arrives the text is drawn in "Geist Mono Fallback": a monospace face the device already has (Menlo, Roboto Mono, Liberation Mono, DejaVu Sans Mono or Courier New), with Geist Mono's ascent and descent. Each is six tenths of an em wide, as Geist Mono is, and every line's height is set in pixels, so the swap changes the letters' shapes and nothing's position. vinext's generated fallback was Arial resized, whose letters are not one width.

Measured by `node scripts/font-load.mjs` on a production build in fixture mode (`approved-look/font-load.json`): five pages at both widths, each opened cold in a new browser context, once as the network gave it and once with the font file held back two seconds.

- At the swap, the first ledger row's cells, the page's own blocks and its height moved **0px** on every page at both widths. The machine that measured has Liberation Mono; a device with none of the five faces falls back to its own `ui-monospace` or `monospace`, whose width is not promised.
- The layout shift in the frames after the font arrived was **0** on all ten held-back loads.
- Over a whole load, Standings, a player and a game shift 0. Home shifts up to 0.0026 on a phone and 0.0234 at 1440, and a team up to 0.0047, by an amount that varies from one load to the next with when the page hydrates and is the same with the font held back or not: the times in the score strip are rewritten in the visitor's zone, and Home's Favorites block grows a line when the browser turns out to hold none. Both were on the site before this change (0.0095 on hockey.yogan.dev's Home the same day, with a shorter slate) and are #140's "zero layout shift" to fix.
- The text does change face once on a cold load on a slow connection: `swap` shows the fallback at once and never hides the words. What is ruled out is the words moving, and the invisible text `block` would give.

## Decisions taken without asking

- **The typeface stays the one `next/font/google` builds**, not the `geist` package's file: vinext already self-hosts, subsets and preloads it, and the package's variable file is the whole character set.
- **The heart keeps its drawn, square-cornered shape** and takes the prototype's size (a score's: 16px, 20px on a phone) and a 44px reach on a phone. The prototype's rounded heart is a different glyph, not a colour, type or spacing change.
- **A team's mark is 1.2 times its type** (15.6px in a row, 18px on a phone), as the prototype draws it, where it was 14px. Its files are now chosen 28, 42 and 84px for 1x, 2x and 3x screens, so the larger mark is not drawn from too small a file.
- **The rule beside the sidebar and the rule over the footer** are drawn as the prototype has them, since each is one class. The audit of every rule's ends is still #140.
- **The words on the rink are not brought to the prototype's sizes**, the caption under it keeps its filled box, and the phone keeps its menu: the rink is #141 to #143's and the tab bar #139's. The rink and game-stream components changed only where a class named a colour, size or weight token, which makes the rink's 10px words the small size (11px, 12px on a phone) where the prototype has 12px.
- **The rank column of a full standings table keeps its 32px minimum**, 8px wider than the prototype's, so the teams of one table start level with the next's when a table reaches rank 10 (the league and wild card views, which the prototype does not draw). Home's shorter tables have the prototype's widths.
- **Between 768 and 1280px a team's record stays under its abbreviation** in the small size, as production had it; the prototype is not drawn at that width and the record does not fit beside a favorite's star there.
- **A player's name in his page's header is the score size** (16px, 20px on a phone), where it was 16px beside 13px text.
