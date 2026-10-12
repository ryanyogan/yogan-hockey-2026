# The desktop sidebar (#153)

> **Superseded by [agate.md](../agate.md) on 2026-10-11.** The Agate look replaced this in #168 to #174; this page and its screenshots are kept as history.

Ryan, 2026-10-11: "can you give me a more consistent and cool looking sidebar that matches the rest of the site?"

## What was wrong with it

The tuned ledger (#138) redrew everything but the sidebar. Beside the ruled page it was a leftover (`before-*.png`):

- **No rules.** The score strip's rule stopped at the sidebar's edge; nothing in the sidebar was ruled at all.
- **No labels.** Every block of the page has a section header and column headers; the links had neither.
- **Two left edges.** The wordmark began 16px in and the links 24px in.
- **Its own row height.** A link was 28px; a ledger row is 33px, so no line of the sidebar sat beside a line of the page.
- **Empty.** Five links at the top, a text button at the bottom, nothing between and nothing that changes.
- **A theme control from elsewhere.** "light mode" was a line of text floating above the bottom edge, on no rule.

## What it is now

One column of ledger, 192px wide as before (`after-*.png`):

| Part | Drawn as | Meets |
| --- | --- | --- |
| Wordmark | A cell 36px tall with the shell's rule under it | The score strip's rule: one line across the window |
| Site | A section header, column headers (`# PAGE`) on the heavier rule, then five numbered rows of 33px. The current place is a solid block | The page's first section header (60px down), its column headers and, on a page that opens with a ledger, its rows |
| Tonight | The same two header lines with the slate's day, then a count to a row: live, to come, final (and postponed on a day that has one). A live count wears the live tint and dot. The rows are one link to Scores | Fed by the page's one Scoreboard socket (`useScoreboard()`); it moves when a game starts or ends |
| Theme | A ruled strip of two cells, `LIGHT` and `DARK`, the one shown a solid block | The footer's rule, on a page short enough to show both |

Everything starts 16px in. Every rule runs the sidebar's whole width and ends on the rule beside the content column. Hover is the ledger's highlight; focus is a ring drawn inside the row, since the sidebar's edge would cut one drawn around it. Only theme tokens and the one spacing scale are used.

## Decisions

- **Rules run edge to edge** where a page's ledgers are inset. The sidebar is part of the shell, like the strip, and a rule that stopped 16px short of the column's rule would meet nothing.
- **The places are numbered** as a ledger ranks its rows. The numbers are for the eye (`aria-hidden`): a link's name is still "Home".
- **"Tonight" shows counts, not games.** The strip already lists the games; the sidebar says how the night stands in a glance and keeps one height whatever the slate, so nothing moves when it arrives. Its rows hold their room, empty, until the Scoreboard has been read.
- **The slate's day is in the header**, where a section header has its aside. The link's name is what it shows, after "Tonight's scores:" for a screen reader.
- **No live count beside "Scores"**: the Tonight block is directly under it and says the same.
- **The theme is two cells, not one toggle**: both choices are on show and the one in force is marked as the current place is. `aria-pressed` says which once the browser knows. The phone's top bar keeps its toggle (#139's).
- **Nothing was built on Favorites**, which are moving to Accounts.
- **The width did not change**, so no page's layout did.
- **The titles are not headings** (`<p>`): they come before the page's own first heading in the document. The places are a `nav` named "Site" as before.
- **The places are drawn in the first HTML**, marked from the path, and again once the query string is known, as the tab bar's are (#139).
- **A short window scrolls the sidebar inside itself** (`after-home-live-768-h420-*.png`); nothing is clipped or overlaps.

## Measured

`node scripts/sidebar-shots.mjs http://localhost:<PORT> docs/design/sidebar after` (and with `--slate=live|quiet|empty`, `--height=420`) shoots the set and prints, per shot, the strip's rule and the sidebar's (36px and 36px in all 18), the content column's left edge (193px before and after) and the page's layout shift, which is the same before and after on every route (Home's is the Favorites block's, #140's).

Client script, gzipped, all chunks of a build, against `main` with the phone's tab bar (#139) in it: 301,915 bytes before, 303,860 after (+1,945). The sidebar's own chunk is 1,515 bytes; the rest is the places' list and the day's formatter becoming chunks of their own, now that two scripts share them. The script budgets (`scripts/performance/budgets.ts`) were not measured again: the full baseline is 50 minutes.
