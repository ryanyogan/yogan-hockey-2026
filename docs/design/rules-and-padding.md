# Rules that meet and one spacing scale (#140)

A pass over every route against the approved prototype ([tuned-ledger.md](tuned-ledger.md)), after #138 had put its colours, type and spacing tokens on them ([approved-look.md](approved-look.md)). This page records what was measured, what was found and what was changed.

## How it is checked

`node scripts/look-audit.mjs <site> <outDir>` opens every route in fixture mode at 390px and 1440px, in light and in dark (18 pages, 72 loads, each a second time with no favorites in the browser), and fails on any of:

- **Overflow**: the document wider than the window.
- **A rule's end astray**: every border, and every filled box a pixel or two thick, is a rule. Lengths that touch at one height in one colour are joined (the cells of a header row draw one rule between them). Each end must then be, within half a pixel, on another rule, on the edge of the page, or, for a rule that runs across, on the edge of the column it is drawn in: `<main>`'s content box, or a cell of a grid or of a row of boxes. Tables are not boxed, so a row's rule ends at its column's edge, as the prototype has it. A rule that runs down has no such edge: it must end on a rule or on the page's edge. An end within 24px of a rule it does not reach is reported as stopping short of it or overshooting it, by how much.
- **Spacing off the scale**: every computed padding, margin and gap of every drawn element must be 0, 4, 8, 12, 16, 24, 32 or 48px, or be one of the four things allowed by name below.
- **A layout shift** on load of 0.0005 or more (what prints as 0.000 is zero, as in [the performance baseline](../performance/baseline.md)), with what moved recorded for each.

Allowed off the scale, each with its reason in the script (`ALLOWED`):

| What | Value | Why |
| --- | --- | --- |
| `py-row`, a row's padding above and below | 6px, 11px on a phone | The prototype's 33px and 45px rows: a 20px (22px) line, this, and the rule. On a ledger's cells and on what is drawn as a row of one: a play, an empty ledger's line, the search box. |
| The space after a team's mark and after the live dot | 0.45em, 0.6em | They stand in a line of text, and the prototype sets the space after them in that text's size, as a word space is. |
| A badge's padding above and below | 1px | A 16px line, 1px and its 1px border make the 20px line it sits in. |
| A negative margin of 1px | 1px | Laps one rule over the next so that two do not double. |

Not audited: the rink, what is drawn on it and the caption under it (#141 to #143), states a page is not in when it loads (the phone's menu and the ticker's opened slate, both read by eye), and a rule drawn by `::before` or `::after`, which the script lists for the eye (there is none).

## Before and after

[rules-and-padding/before/](rules-and-padding/before/) is `main` at `d3aed25`, where this ticket started; [rules-and-padding/after/](rules-and-padding/after/) is this branch. Each holds 72 screenshots (`<page>-<width>-<theme>.png`, by `scripts/look-shots.mjs`, with its `manifest.json`) and the audit's `audit.md` and `audit.json`, both sets from the same scripts against the same dev server in fixture mode.

| | Before | After |
| --- | ---: | ---: |
| Pages that overflow | 0 of 72 | 0 of 72 |
| Rules measured | 3148 | 3156 |
| Rule ends astray | 22 (one fault, on the scoring tab at 1440px) | 0 |
| Spacing off the scale | 4 (one fault: the rink caption's placeholder, 2px) | 0 |
| Measured against the prototype (`look-compare.mjs`) | 160 measurements, 0 differ | 160 measurements, 0 differ |

#138 had already put nearly every value on the scale, so the audit's own findings were few. Most of what changed was found by reading the screenshots beside the prototype's.

## What was found and changed

- **The scoring list stopped short of its column.** Its rows were held to 896px, so at 1440px each row's rule ended 304px from the right edge, under a timeline and a tab strip that run the whole column. It also had no rule above its first row, where the plays list beside it has the heavier one a ledger has under its column headers. Both lists now stand under that rule and run the column, and the shootout's rows have their own under a title spaced as a section's is (8px above its rows, 24px under the goals).
- **The search box on Players stood 8px inside the column**, so its sides lined up with nothing: not with the rules of the ledgers under it, and not with their text. It now starts at the column's edge, where those rules start, and its label and its text stand 8px in, as a ledger's header and cells do.
- **A team's name was the size of every section title on its page**, where a player's name leads his. `SectionHeader` takes `lead`, which draws the title in the score's size (16px, 20px on a phone) on the same line, so the header is no taller; the team page uses it. The pages now read: a team or a player by its name, a game by its score on the rink, and Home, Scores and Standings by their ledgers, whose scores and points are the bold figures.
- **The rink caption's placeholder** is named as what it is (`rink-caption-placeholder`), so the audit leaves it with the rink it repeats.

Read by eye and left as they are, each agreeing with the prototype: the rule beside the sidebar runs the page and meets the strip's and the footer's rules; the strip's dividers and a phone's tab cells run from rule to rule in the frame's colour; the timeline's period lines run from its frame to its frame; the plays list's two columns stand 32px apart under one rule, as the prototype's do; a section's title stands at the column's edge and a ledger's text 8px in from its rules' ends.

## Layout shift

Zero overflow is met. Zero layout shift is not, and none of what is left is spacing, a rule, type or wrapping. The numbers below are from a dev server, which is a lead and not the truth (see the build notes): take the budgeted numbers from `scripts/performance-baseline.sh`.

| What moves | Where | Shift (dev) | Whose |
| --- | --- | ---: | --- |
| The ticker's games change places when the browser's favorite team is read, and its times are rewritten in the visitor's zone | every route | 0.0016 to 0.0046 | #127 |
| The slate's rows change places when the favorite team is read | Scores, the sample slate | 0.0146 to 0.0367 | #127 |
| The Favorites block grows from its one waiting line (to a ledger, or to an empty line that wraps to two) and pushes Standings down | Home | 0.0006 to 0.0234 | #127 (favorites' room held for them) |
| A schedule's times are rewritten in the visitor's zone, and a pick arrives beside the next game | a team's pages, a game to come | 0.0005 to 0.0047 | #127 |
| The top bar's buttons move when the theme's word is drawn | a phone, some loads | 0.0013 | #139 and #127, which both replace the phone's menu |
| The footer jumps as `<main>` fills | a game's pages and the error page at 390px | 0.0116 to 0.0598 | Not seen in a build (the baseline has 0.0000 and 0.0014 for these pages); the dev server paints the shell before the route has compiled. Not verified against a build here. |

## Decisions taken without asking

- **A row's rule ends at its column's edge, not at a rule**, as the prototype draws it and as [tuned-ledger.md](tuned-ledger.md) decided: tables are not boxed. The audit therefore counts a column's edge as a place a rule that runs across may end.
- **The space after a team's mark stays the prototype's 0.45em** (5.85px, 6.75px on a phone) and is allowed by name, where 4 or 8px would have put it on the scale and moved every team's name off the prototype's by a pixel or two.
- **`py-row` is a token beside the scale**, as #138 made it: the prototype's row heights cannot be made from the scale's steps and a 20px line.
- **The team's name takes the score's size**; no other page's type was changed.
- **Favorites on Home is left to #127**, which holds its room; this ticket changed nothing there so the two do not collide.
