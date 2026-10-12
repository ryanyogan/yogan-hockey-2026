# Agate — the approved look

Yogan Hockey as the sports section of a newspaper. Ryan picked this direction ("B · Agate") out of three on Oct 11, 2026, after desktop and phone artboards. It **replaces the tuned ledger** (`tuned-ledger.md`) as the visual target. Features and behaviour stay the same; only the look and the page structure change.

- Prototype: `prototypes/agate` (`pnpm prototype:agate`, port 5129). It is the pixel target.
- Screenshots: `docs/design/agate/home-{tonight|busy}-{390|1440}-{light|dark}.png`.
- Copy rules: `prototypes/agate/copy.js`. Every sentence the page prints, as pure functions.

## The idea in four lines

1. **Two voices.** A serif (Newsreader) for anything that *reads*: the masthead, headlines, decks, big numbers. A condensed grotesque (IBM Plex Sans Condensed) for anything that's *looked up*: tables, labels, nav, meta.
2. **Rules, not boxes.** Structure comes from four kinds of line: heavy (3px ink), plain (1px ink), hairline and dotted. There are no cards, shadows, fills or radii. `--radius` stays 0.
3. **One red.** `--kicker` marks section labels, kickers, the current nav item and anything live. Nothing else is colored.
4. **Write it like a paper.** Games get headlines ("Kraken 5, Capitals 3") and a deck sentence built only from data. Standings are agate.

## Tokens

The names match `packages/ui/src/theme.css` roles, so the port is mostly a value swap. `.dark` is next-themes' class.

| Token | Day | Night | Use | Contrast (day / night) |
|---|---|---|---|---|
| `--background` | `#fafaf8` | `#121212` | page | — |
| `--foreground` | `#111111` | `#eceae4` | text, filled marks | 18.1 / 15.6 |
| `--note` | `#2b2a27` | `#d6d3cc` | serif decks, sidebar prose | 13.7 / 12.5 |
| `--label` | `#5c5a55` | `#a3a09a` | column heads, counts | 6.6 / 7.2 |
| `--aside` | `#5c5a55` | `#a3a09a` | records, GP, TV line, footer | 6.6 / 7.2 |
| `--kicker` **(new)** | `#c8102e` | `#ff5a5f` | labels, kickers, current nav, live | 5.6 / 6.1 |
| `--live` | `= --kicker` | `= --kicker` | live dot, live rule, live status | 5.6 / 6.1 |
| `--live-tint` | `#fbeeef` | `#2a1516` | (optional) live row tint | kicker on it 5.2 / 5.7 |
| `--highlight` | `#f0efeb` | `#1f1f1e` | row under the pointer | — |
| `--rule` | `#111111` | `#eceae4` | heavy and plain rules | — |
| `--rule-head` | `#d5d3ce` | `#34332f` | hairline under column heads | decorative |
| `--border` | `#c9c6bf` | `#4a4843` | **dotted** rule between agate rows | decorative |
| `--positive` / `--negative` | keep | keep | goal difference | recheck on new grounds |

shadcn roles (`--primary`, `--secondary`, `--muted`, `--accent`, `--popover`…) follow the same values: primary is ink on paper, secondary/muted/accent is `--highlight`.

The PWA colors change with these: `THEME_COLORS = { light: "#fafaf8", dark: "#121212" }` and `INK_COLORS = { light: "#111111", dark: "#eceae4" }` in `apps/web/lib/install.ts`. Then regenerate icons and splash screens with `pnpm app-icons`.

## Type

Load both fonts with `next/font/google`, as Geist Mono is loaded today, and expose them as `--font-serif` and `--font-agate`. Newsreader needs its `opsz` axis. If vinext's font shim can't pass `axes`, self-host the variable woff2.

| Role | Face | Size desktop → phone | Weight / leading / tracking |
|---|---|---|---|
| Wordmark | Newsreader, opsz 72 | `clamp(54px, 9vw, 120px)` → 54px | 700 / .92 / -0.025em |
| Headline | Newsreader, opsz 60 | 40 → 34px | 700 / 1.02 / -0.015em, `text-wrap: balance` |
| Section title ("Standings") | Newsreader | 32 → 30px | 700 / 1.1 / -0.01em |
| Big stat ("29–14") | Newsreader | 72 → 52px | 700 / .95, lining nums, no wrap |
| Deck | Newsreader | 19 → 18px | 400 / 1.4, `--note` |
| Pick line, sidebar prose | Newsreader *italic* (pick) / roman | 17px | 400 / 1.4 |
| Body / table rows | Plex Sans Condensed | 15px (16px line score, phone standings) | 400, tabular nums |
| Nav, meta, TV, footer | Plex Sans Condensed | 13px | 600 nav (uppercase, .1em), 400 meta |
| Label / kicker | Plex Sans Condensed | 12px | 600–700, uppercase, .14–.18em, `--kicker` |
| Column head | Plex Sans Condensed | 11px | 700, uppercase, .08–.12em, `--label` |

All numbers are `tabular-nums`. Records never break across lines: wrap them in word joiners (`rec()` in copy.js) or `white-space: nowrap`.

## Rules

| Rule | CSS | Where |
|---|---|---|
| Heavy | `3px solid var(--rule)` | top of every story, top of the lower band, top of the masthead double rule |
| Plain | `1px solid var(--rule)` | second line of the double rule, line-score frame, conference title underline, picks box |
| Hairline | `1px solid var(--rule-head)` | under column heads, under the utility bar |
| Dotted | `1px dotted var(--border)` | between agate rows (standings, line score, briefs) |

A live story swaps its heavy top rule to `--live`.

## Page anatomy (Home)

**Masthead**
- Utility bar: section nav (Home, Scores, Standings, Teams, Players; current item in `--kicker`) on the left, the Day/Night theme control on the right.
- The wordmark sits centered below it.
- Under the wordmark, a double rule (3px + 1px) carries the **dateline**: the long date, "Tonight: N games · X live · Y to come · Z final" (zero counts dropped), and "Picks this season: R right, W wrong". The dateline takes over from the sidebar's TONIGHT block and the old picks summary.

**NHL Roundup: leads.**
- Up to three games are drawn as full stories in a `repeat(auto-fit, minmax(300px, 1fr))` grid. Each story, top to bottom:

| Part | Final | Live | Scheduled | Postponed |
|---|---|---|---|---|
| Top rule | ink | **red** | ink | ink |
| Kicker | `Final · Venue` / `Final/OT · …` | `● Live · 3rd 18:44 · Venue` (the dot pulses; still under reduced motion) | `8:40 PM · Venue` | `Postponed · Venue` |
| Headline | winner first: "Kraken 5, Capitals 3" | away, home: "Mammoth 2, Devils 2" | "Golden Knights at Kraken" | same as scheduled |
| Deck | "The Kraken win on the road and move to 4-2-0. The Capitals fall to 3-2-0." (+ "in overtime" / "in a shootout") | "The Rangers lead by 1 in the 3rd." / "Tied 2–2 in the 3rd." / "Tied in overtime." | "The Golden Knights (2-1-0) visit the Kraken (2-1-0)." | "Postponed." |
| Line score | Team · Rec · **F** (winner bold) | Team · Rec · **Now** | Team · Rec | Team · Rec |
| Pick line | *Our pick: Washington, 63%.* + **Right** (filled) / **Wrong** (outlined) | *Our pick: …* (no mark) | *Our pick: …* | *Our pick: …* |
| TV | **On TV** list | same | same | same |

- The headline links to the game page. No pick means no pick line.
- **Which games lead:** live first, then the next to start, then the latest finals. Each group keeps the slate's stable order (`docs/design/stable-game-order`). A game only moves when its status changes.

**Around the league: briefs.**
- Every game that isn't a lead goes in an `auto-fill, minmax(280px, 1fr)` list. Each brief has three parts:
  - Line one is the game: "Montreal 3, Carolina 2" (final, winner first), "Utah 2, New Jersey 2" (live, away first) or "Vegas at Seattle" (scheduled).
  - Line two, left, is the status, in red when live.
  - Line two, right, is the pick: "MTL 52%" plus a mark when final, or "No pick".
- Briefs are separated by dotted rules. This keeps a 16-game night scannable.

**Lower band** (heavy rule above). Desktop: Standings (`flex: 999 1 560px`) beside an aside (`flex: 1 1 300px`).
- **Standings:** a serif title and a "Full standings" link. East and West agate tables sit side by side, each under a red label with an ink underline. Columns are Team (agate name), GP (in `--aside`), W, L, OT and **PTS** (bold).
- **The Picks:** a 1px ink box with a red label, the big serif record, and "Right on 67% of games this season. Two of three tonight." The second sentence only counts picked finals and spells out numbers up to ten.
- **Tonight at a glance:** three counts (Live, To come, Final) in serif, separated by hairlines.
- **Favorites:** a red label with "All players" beside it. The empty state is serif prose. A populated state wasn't drawn: use agate rows (player name, team in `--aside`, the stat line in tabular nums, the heart button at the right) with dotted separators.

**Footer:** a 1px ink rule over the ESPN credit and the family-project line in `--aside`.

## Phone (< 768px, Tailwind `md`)

| Desktop | Phone |
|---|---|
| Utility bar with nav + Day/Night text buttons | Short date on the left, one icon button on the right that switches theme (moon by day, sun by night; `aria-label`) |
| Nav above the wordmark | Nav under the wordmark, between the double rule and a plain rule, in a horizontal scroll row; each item 44px tall |
| Three-part dateline | One line: "3 games · 3 final · Picks 29–14" |
| Story grid | Stories stacked; headline 34px |
| Briefs in 4 columns | One column |
| Standings beside the aside | Order: **Picks box** (row layout) → **Standings** → **Favorites**; "Tonight at a glance" is hidden because the dateline carries it |
| East and West side by side | An Eastern/Western segmented control (`role="group"`, `aria-pressed`, 44px) shows one table at a time |
| `--gutter` 24px | 16px |

There is no sidebar, no top status bar and no bottom tab bar in this design (see open questions in HANDOFF.md).

## Other pages (not drawn: extend the system)

- `Ledger` becomes an agate table: 11px uppercase column heads over a hairline, dotted row rules and tabular nums. Numbers are right-aligned, and the key number (PTS, score, points) is bold.
- `Section` becomes a red label over a 1px ink rule. A page title is a serif section title over a 3px rule.
- Team and game page headers use a serif headline. The game page's line score and pick follow the story parts above.
- The rink drawing is recolored from the tokens; ink on paper reads well.
- Tabs (`url-tabs`) look like the phone conference control.
- Badges and markers become the `mark` style: 12px uppercase, a 1px ink border, filled for the positive state.

## Accessibility

- All text roles pass AA in both themes (table above). Rules are decorative.
- Tap targets are at least 44px: nav items, the theme control, the conference control and "more" links.
- The theme and conference controls are real `<button>`s with `aria-pressed` inside a labelled `role="group"`.
- Tables are real `<table>`s. The line score has a caption naming the game and uses `<th scope="row">` for team names.
- There's a skip link to `#content`. The live dot is `aria-hidden`, because "Live" is in the text.
- At 390px nothing scrolls sideways; the prototype is measured at a `scrollWidth` of 390.
