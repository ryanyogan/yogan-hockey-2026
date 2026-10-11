# The tuned ledger: prototype for approval (#128, #129)

This is a tuning of the ledger design that is in production today ([original-restored.md](original-restored.md)), not a new direction. It stays monospace throughout, with ruled tables, square corners, the paper and slate themes and the desktop sidebar. It is a prototype only: production is unchanged until Ryan approves it in #129, and its screenshots then become the visual target for the production UI tickets.

## Ryan: how to look at it

```sh
pnpm prototype:look
```

Open the "Phone, same Wi-Fi" address it prints on the phone, and `http://localhost:5128` on the desktop. The purple bar is the switcher: its arrows step through the typeface and weight combinations, and tapping its label opens theme, today's colours and reduced motion. On the phone, Scores in the tab bar opens the live game; the dashed box there replays each animation.

## What you are being asked to decide (#129)

1. **Typeface**: Geist Mono (today's), JetBrains Mono or IBM Plex Mono.
2. **Weights**: Regular (400 and 700, as today), Medium (500 body, 700 bold) or Heavy (500 body, 800 scores and titles). IBM Plex Mono has no 800, so its Heavy draws scores and titles at 700 and differs from its Medium only in the 600 labels.
3. **Colours**: the tuned rules and secondary text, in paper and in slate. "Today's" in the switcher shows the current colours on the same page.
4. **The phone tab bar**: five destinations at the foot of the screen in place of the menu.
5. **The goal sequence**, the shot and the save: right, or what to change.

The prototype opens on Geist Mono at Medium, which is the recommendation: it keeps the typeface the site already loads, and the 500 body is the smallest change that makes 15px text hold up on a phone in slate. The other eight combinations are one tap away.

## What changed from today, and why

| Area | Today | Prototype | Why |
| --- | --- | --- | --- |
| Secondary text | The foreground at 60, 50 and 40% opacity | Three solid colours per theme | Records, ranks and the footer were 2.5:1 on paper and 3.6:1 on slate; every text colour now passes AA (4.5:1 or better) |
| Rules | Row rule 1.2:1 in both themes; shell rule 1.4:1 on paper | Row rule 1.65:1 (paper), 1.99:1 (slate); header and shell rules 3.5:1 and 3.75:1 | Slate tables did not read as tables |
| Rules at corners | The sidebar's rule stopped one screen down on a long page (see `original-restored/replay-1440-dark.png`); the footer had no rule; the strip's dividers were a different colour from its frame | The rule beside the sidebar runs the page and meets the strip's and the footer's rules; strip, tab-strip and tab-bar dividers are the frame's colour and run rule to rule | Stray ends looked accidental |
| Spacing | Tailwind steps chosen per component | One scale: 4, 8, 12, 16, 24, 32, 48px | Pages look deliberate |
| Hierarchy | Mostly one weight, two sizes | Five weight roles (quiet, body, label, strong, score); a losing score and a loser's name step back; the pick and venue in the note are told apart | The score is found before the detail |
| Phone type | 13px body, 10px labels, 16px scores | 15px body, 12px labels, 20px scores | Readable by a child at arm's length |
| Phone targets | Standings rows 28px; tabs 24px | Every row, tab and button at least 44px (rows 45 to 55px, tab bar 56px) | No mis-taps |
| Phone navigation | A "menu" button dropping a panel | A fixed tab bar with the five destinations, padded for the home bar (`env(safe-area-inset-bottom)`) | One thumb-tap each |
| Desktop type | 13px body, 10px labels | 13px body, 11px labels | The labels were the hardest text to read |
| Rink | Dots on a still rink | A crease, a net and a goal lamp at each end; shot, save and goal animated | See below |

Unchanged on purpose: the sidebar and its width, the score strip, the 16 and 24px page gutters, unboxed uppercase section titles, the solid block for the current place, the live tint and red marker, every table's columns, the rink's geometry and overlay positions.

## Contrast (WCAG 2.x ratio against the page background)

Measured by `node prototypes/tuned-ledger/contrast.mjs` from the same values the page uses (`prototypes/tuned-ledger/tokens.js`). Today's secondary text is the foreground at an opacity, measured as the solid colour it composites to.

| Theme | Use | Today | Ratio | Tuned | Ratio |
| --- | --- | --- | ---: | --- | ---: |
| light | Body text, scores | `#171717` | 17.18 | `#171717` | 17.18 |
| light | Notes, idle links, second lines | `#727271` | 4.61 | `#44403c` | 9.84 |
| light | Column headers, counts | `#898987` | 3.36 | `#57534e` | 7.31 |
| light | Asides: records, ranks, footer | `#a09f9d` | 2.53 | `#6b6660` | 5.45 |
| light | Live marker | `#dc2626` | 4.63 | `#c81e1e` | 5.50 |
| light | Rule under a row | `#e5e5e5` | 1.21 | `#c9c5bc` | 1.65 |
| light | Rule under a column header | `#cdcdca` | 1.53 | `#8a857c` | 3.51 |
| light | Rules framing the shell | `#d4d4d4` | 1.42 | `#8a857c` | 3.51 |
| light | Body text on a live row | `#171717` | 16.39 | `#171717` | 15.69 |
| light | Asides on a live row | `#a09f9d` | 2.42 | `#6b6660` | 4.97 |
| dark | Body text, scores | `#f1f5f9` | 16.30 | `#f1f5f9` | 16.30 |
| dark | Notes, idle links, second lines | `#979ca6` | 6.48 | `#cbd5e1` | 12.02 |
| dark | Column headers, counts | `#808692` | 4.88 | `#a9b6c8` | 8.68 |
| dark | Asides: records, ranks, footer | `#69707d` | 3.58 | `#94a3b8` | 6.96 |
| dark | Live marker | `#f87171` | 6.45 | `#f87171` | 6.45 |
| dark | Rule under a row | `#1e293b` | 1.22 | `#3b4a61` | 1.99 |
| dark | Rule under a column header | `#3c4353` | 1.80 | `#64748b` | 3.75 |
| dark | Rules framing the shell | `#475569` | 2.36 | `#64748b` | 3.75 |
| dark | Body text on a live row | `#f1f5f9` | 14.98 | `#f1f5f9` | 13.77 |
| dark | Asides on a live row | `#69707d` | 3.29 | `#94a3b8` | 5.88 |

Every text colour now passes WCAG AA for normal text (4.5:1). The rules framing the shell and under column headers pass the 3:1 asked of non-text boundaries. The rule under a row stays below 3:1 on purpose: it separates rows that the text already separates, and at 3:1 a table of sixteen rows turns into a grid.

## The rink

The existing SVG rink, animated with GSAP's core. No three.js. Sound is not present at all.

- **Shot**: a line drawn from where it was taken, with the puck on it. A miss runs wide of the post to the end boards and fades back.
- **Save**: the line stops at the edge of the crease, with a bar across it, one ring, and the crease lit in the save colour.
- **Goal**: the line reaches the net; the goal lamp on the boards behind it comes on and beats three times; the scoring end floods with the team's colour and settles to a tint; the score rolls to the new figure; "GOAL" replaces the live marker; the caption names the scorer on the team's colour.
- **Reduced motion**: the same timeline jumped to its last frame, so the end state is identical and nothing moves. It follows `prefers-reduced-motion`; the switcher can force it for a look, or force full motion on a device that asks for less.
- Only what ESPN records is drawn. A blocked shot is recorded where the blocker stood, so it gets no line; a play without a coordinate gets none.

Two things the production ticket should carry over: the split into `describe` (a pure function, play to description) and `animate` (GSAP plays a description), and the dark-theme lift of a team colour too dark to see on slate (Buffalo's navy) before it is used as a tint.

### GSAP: size and licence

- **Version**: 3.15.0, the current release on npm and the version gsap.com's installation page shows.
- **Size**: `dist/gsap.min.js` from the npm package is 72,927 bytes, 28,268 bytes gzipped (measured with `gzip -9`). gsap.com's installation page states no size, so these are measurements, not a quoted figure. The prototype uses the core only, no plugins.
- **Licence**: not open source. It is GSAP's "Standard 'no charge' license" (<https://gsap.com/standard-license>, effective 30 April 2025): free of charge, commercial use included, every plugin included. Webflow keeps ownership. The prohibited use is building GSAP into a tool that lets users make visual animations without code in competition with Webflow, which this site is not. Proprietary notices must stay in the file, and they do.

## Screenshots

In [tuned-ledger/](tuned-ledger/), taken by `prototypes/tuned-ledger/capture.mjs` at 390px (2x) and 1440px in light and dark, on Geist Mono at Medium unless named otherwise. `manifest.json` records, for each, the font, type sizes, row and tab-bar sizes, horizontal overflow (none) and browser errors (none).

| Screen | 390 light | 390 dark | 1440 light | 1440 dark |
| --- | --- | --- | --- | --- |
| Home | [png](tuned-ledger/home-390-light.png) | [png](tuned-ledger/home-390-dark.png) | [png](tuned-ledger/home-1440-light.png) | [png](tuned-ledger/home-1440-dark.png) |
| Live game | [png](tuned-ledger/game-390-light.png) | [png](tuned-ledger/game-390-dark.png) | [png](tuned-ledger/game-1440-light.png) | [png](tuned-ledger/game-1440-dark.png) |
| Standings | [png](tuned-ledger/standings-390-light.png) | [png](tuned-ledger/standings-390-dark.png) | [png](tuned-ledger/standings-1440-light.png) | [png](tuned-ledger/standings-1440-dark.png) |

Also there:

- `rink-goal-*`, `rink-goal-home-*`, `rink-shot-*`, `rink-save-*`: the end state of each animation (what reduced motion shows), at both widths and themes.
- `type-<font>-<weights>-390-*`: the nine typeface and weight combinations on the phone's Home.
- `today-colours-390-*`: the same page with today's colours and weights, for comparison.
- `switcher-390-*`: the switcher open.

The phone pages are shot in a viewport as tall as the page, so the tab bar is at the foot of the image; on a phone it stays fixed at the foot of the screen (see the `type-*` shots).

## Decisions taken without asking

- Kept the 8px inset of ledger text from the ends of its rules, as today. "Rules that meet at corners" is read as rules that end where another rule or the page edge is, not as boxing every table.
- The phone tab bar is words only, with the current place a solid block like the sidebar's. Icons would be a second visual language.
- Scores in the tab bar opens the live game, since the Scores page is not one of the three screens.
- The goal lamp sits on the boards behind the net, where it does not collide with the "shoots this way" label.
- Desktop body type stays 13px. Only its 10px labels grew, to 11px.
