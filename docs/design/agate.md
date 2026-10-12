# Agate — the approved look

Yogan Hockey as the sports section of a newspaper. Ryan picked this direction ("B · Agate") out of three on Oct 11, 2026, after desktop and phone artboards. It is the visual target, and has been the whole site's look since #168 to #174; the tuned ledger (`tuned-ledger.md`) is superseded. Features and behaviour are the Parity Reference's; only the look and the page structure are Agate's.

- Prototype: `prototypes/agate` (`pnpm prototype:agate`, port 5129). It is the pixel target.
- Screenshots: `docs/design/agate/home-{tonight|busy}-{390|1440}-{light|dark}.png`.
- Copy rules: `prototypes/agate/copy.js`. Every sentence the page prints, as pure functions.

## The idea in four lines

1. **Two voices.** A serif (Newsreader) for anything that *reads*: the masthead, headlines, decks, big numbers. A condensed grotesque (IBM Plex Sans Condensed) for anything that's *looked up*: tables, labels, nav, meta.
2. **Rules, not boxes.** Structure comes from four kinds of line: heavy (3px ink), plain (1px ink), hairline and dotted. There are no cards, shadows, fills or radii. `--radius` stays 0.
3. **One red.** `--kicker` marks section labels, kickers, the current nav item and anything live. Nothing else is colored.
4. **Write it like a paper.** Games get headlines ("Kraken 5, Capitals 3") and a deck sentence built only from data. Standings are agate.

## Tokens

These are the values in `packages/ui/src/theme.css`. `.dark` is next-themes' class. The contrast is WCAG 2's ratio against `--background`, and in brackets against `--highlight` (the row under the pointer), rounded down; `packages/ui/src/theme.test.ts` computes both from the stylesheet and fails under 4.5.

| Token | Day | Night | Use | Contrast (day / night) |
|---|---|---|---|---|
| `--background` | `#fafaf8` | `#121212` | page | — |
| `--foreground` | `#111111` | `#eceae4` | text, filled marks | 18.0 (16.4) / 15.5 (13.7) |
| `--note` | `#2b2a27` | `#d6d3cc` | serif decks, prose | 13.7 (12.4) / 12.5 (11.0) |
| `--label` | `#5c5a55` | `#a3a09a` | column heads, counts | 6.5 (5.9) / 7.1 (6.3) |
| `--aside` | `#5c5a55` | `#a3a09a` | records, GP, TV line, footer | 6.5 (5.9) / 7.1 (6.3) |
| `--kicker` | `#c8102e` | `#ff5a5f` | labels, kickers, current nav, live | 5.6 (5.1) / 6.1 (5.4) |
| `--live` | `= --kicker` | `= --kicker` | live dot, live rule, live status | 5.6 (5.1) / 6.1 (5.4) |
| `--highlight` | `#f0efeb` | `#1f1f1e` | row under the pointer | — |
| `--rule` | `#111111` | `#eceae4` | heavy and plain rules | — |
| `--rule-head` | `#d5d3ce` | `#34332f` | hairline under column heads | decorative |
| `--border` | `#c9c6bf` | `#4a4843` | **dotted** rule between agate rows | decorative |
| `--positive` | `#166534` | `#4ade80` | a goal difference above zero | 6.8 (6.1) / 10.7 (9.4) |
| `--negative` | `#c81e1e` | `#f87171` | a goal difference below zero | 5.4 (4.9) / 6.7 (5.9) |

shadcn roles (`--primary`, `--secondary`, `--muted`, `--accent`, `--popover`…) follow the same values: primary is ink on paper, secondary/muted/accent is `--highlight`.

There is no tint for a live row: the prototype defined `--live-tint` and drew nothing with it, so the token is gone (#174).

The installed site's colours are these too: `THEME_COLORS = { light: "#fafaf8", dark: "#121212" }` and `INK_COLORS = { light: "#111111", dark: "#eceae4" }` in `apps/web/lib/install.ts`, which the manifest, the `theme-color` meta and `pnpm app-icons` (the icons and splash screens in `apps/web/public/icons/`) all read.

## Type

Both faces are self-hosted: the font files are the site's own (`apps/web/public/fonts`, the unhinted files Google Fonts serves, kept under hashed names), `apps/web/src/fonts.css` declares their faces, and `apps/web/src/head.ts` preloads the five Latin ones that every page draws, so no page asks Google for anything. `node scripts/built-fonts.mjs` fails a build whose pages name a font file it does not hold. Newsreader is one variable file with its `opsz` axis (and a second, the italic, fetched only when a pick line is drawn); IBM Plex Sans Condensed is four files, 400, 500 (the dateline), 600 and 700, all drawn and all preloaded. `packages/ui/src/theme.css` exposes them as `--font-serif` and `--font-agate`, each followed by its sized fallbacks (`packages/ui/src/font-fallbacks.css`, written by `node scripts/font-fallbacks.ts`). `node scripts/font-load.mjs` measures how they arrive.

| Role | Face | Size desktop → phone | Weight / leading / tracking |
|---|---|---|---|
| Wordmark (`text-wordmark`) | Newsreader, opsz 72 | `clamp(54px, 9vw, 120px)` → 54px, less under 390px | 700 / .92 / -0.025em |
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
- Under the wordmark, a double rule (3px + 1px) carries the **dateline**: the long date, "Tonight: N games · X live · Y to come · Z final" (zero counts dropped), and "Picks this season: R right, W wrong". The record is in the page's first HTML and is read again when a game goes final or a pick is made.

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

**Footer:** a 1px ink rule over the ESPN credit and the family-project line in `--aside`.

## Phone (< 768px, Tailwind `md`)

| Desktop | Phone |
|---|---|
| Utility bar with nav + Day/Night text buttons | Short date on the left, one icon button on the right that switches theme (moon by day, sun by night; `aria-label`) |
| Nav above the wordmark | Nav under the wordmark, between the double rule and a plain rule, in a horizontal scroll row; each item 44px tall |
| Three-part dateline | One line: "3 games · 3 final · Picks 29–14" |
| Story grid | Stories stacked; headline 34px |
| Briefs in 4 columns | One column |
| Standings beside the aside | Order: **Picks box** (row layout) → **Standings**; "Tonight at a glance" is hidden because the dateline carries it |
| East and West side by side | An Eastern/Western segmented control (`role="group"`, `aria-pressed`, 44px) shows one table at a time |
| `--gutter` 24px | 16px |

There is no sidebar, no top status bar and no bottom tab bar. The section nav row is `position: sticky` on a phone, below the status bar of an installed site (`--safe-top`), and above it the full double rule (3px, then 1px) is drawn, which the prototype's own screenshots clip to one line. Home's `h1` is the wordmark; every other page's is its own title.

## Other pages (not drawn: the system extended)

The prototype draws Home only. Every other route is built from the same tokens, type and rules, and the pictures kept in `docs/design/agate/` (`scores-*`, `standings-*`, `teams-*`, `team-*`, `game-*`, `player*`, `not-found-*`) are what was built.

- **Every page but Home** has a slim score strip under the masthead (13px Plex Condensed over a hairline, live scores in `--kicker`, club marks beside the abbreviations) and opens with a page title: a serif section title under a 3px rule (`PageHeader`), which is the page's `h1`.
- **Primitives.** `Ledger` is an agate table: 11px uppercase column heads over a hairline, dotted row rules, tabular figures, numbers right-aligned and the key number (PTS, a score) bold. A phone's row is 44px, not the prototype's 40.2px, so that a row can be pressed. `Section` is a red label over a 1px ink rule. Tabs (`UrlTabs`) are the phone's conference control: a ruled strip, the current cell filled. Badges and markers are the `mark`: 12px capitals in a 1px ink box, filled for the positive state.
- **Scores** (`/nhl/live`) is an agate ledger in sections (In progress, Upcoming, Final, Postponed), not briefs: status, away, home, scores, and a note with the pick and the arena. A final's pick carries the Right or Wrong mark, as a brief's does.
- **Standings** (`/nhl`) is one agate table per group in four views (league, conference, division, wild card). A team is its agate name and a link named by it; a won column is not coloured, and `--positive` / `--negative` are a goal difference's alone.
- **Teams** (`/nhl?tab=teams`) is a list in CSS columns read down each column, not a table.
- **A team's page** opens as a story does: the heavy rule, a red kicker (place, conference, division), the club's name as a serif headline with its mark, then Next Game, and Schedule, Roster and Stats as tabs. In a schedule a win is bold and a loss grey. An opponent is its agate name on a phone and its whole name from `sm` up, in the Next Game card and in the schedule alike.
- **A game's page** opens with the same story a lead on Home is (kicker, headline, deck, line score with the club marks and the shots, pick line, TV), then the rink, the penalty box and the plays. The rink is ink on paper with the one red for a goal; saves, shots and hits are told apart by weight and filling, with a key under the ice, and no club's colour is used. The score is in the story's header and over the ice.
- **Players** is a search and agate rows; a player's page is a serif title with his position and club, and ledgers for his season, games and career.
- **Not found and error pages** are a page title and a sentence of serif prose with a way back; the page of last resort, for a request the site could not answer at all (`apps/web/lib/render-failure.ts`), repeats the wordmark and its double rule in a device's own serif.
- **An empty state** is a sentence of serif prose (`emptyProse`), never a box.

## Decisions

The answers to the six questions the design left open, and the calls made while building (#168 to #174). All shipped as written here.

1. **No bottom tab bar on a phone.** The section nav sits under the wordmark and sticks to the top of the screen.
2. **A slim score strip on every page but Home**, where the roundup and the briefs are the scores.
3. **No team marks on Home, in the standings or in any row.** Marks are drawn only in a team's headline, a game page's line score, and the score strip. The assets are still generated.
4. **The theme control says Day and Night**; next-themes' values stay `light` and `dark`.
5. **Leads and briefs follow `copy.js`**: at most three leads, live first, then next to start, then the latest finals, each group in the slate's stable order. A lead that goes final drops to a brief while three others are live or to come.
6. **Decks are data-derived only**: the sentences in `apps/web/lib/agate-copy.ts`, the port of `copy.js`. Standings places and streaks would be their own ticket.

Calls made while building:

- **The masthead on a phone draws the full double rule** (3px and 1px) above the nav, as the prototype's CSS means and its screenshots clip.
- **Home.** The standings' team names are plain text on a phone (40px rows, as drawn) and links from `md` up. Home has no "pick pending" and no "all scores" link. Favorites are not drawn anywhere: the prototype's Favorites block and the site's hearts were removed in #223, until the site has Accounts (#132, #133). The Picks box is not drawn before any pick is decided. Day `--positive` is `#166534`, a step darker than the tuned ledger's green, for AA on the row under the pointer.
- **The game page.** No club colours on the rink: goals are red, and saves, shots and hits differ by weight and fill, with a key. The score appears in the story header and over the rink.
- **The NHL routes.** Scores is an agate ledger, not briefs. Teams is a CSS-column list. Wins are bold and losses grey. A standings row's link is named by the agate name.
- **The dateline's record of the picks** is read with the page and again whenever the Scoreboard reports a final or a new pick, and not otherwise. (While whole pages were cached it could be about ten minutes old; they no longer are: ADR 0009.)
- **No live row is tinted**, and `--live-tint` was removed.
- **The font swap may move a word, not the page**: `scripts/font-load.mjs` allows 0.05 of layout shift and 32px at the swap, and since #183 every load it measures is inside that (at most 0.006 and 16px with the fonts held two seconds). Until a face arrives its text is drawn in a local face resized to it, with a regular and a bold cut each (`packages/ui/src/font-fallbacks.css`): Times New Roman and Arial on iOS, macOS and Windows, Liberation Serif and Liberation Sans on Linux, Noto Serif and Roboto on Android. The script sets type unhinted, as a phone does. With hinting on, which is desktop Chrome on Linux, three loads still move more than 32px: the player's page at 1440 (37px) and the game page at 390 (62px) and 1440 (65px). No real iOS or Android device has been measured.
- **The standings' four view tabs on a phone** are tracked at Tailwind's `tracking-wider` (.05em), not a theme token: at `tracking-head` (.1em) the strip is 3px wider than a 360px phone (measured: 329 in 326).

## Accessibility

- All text roles pass AA in both themes, on the page and on the row under the pointer (table above; held by `packages/ui/src/theme.test.ts`). Rules are decorative.
- Tap targets are at least 44px on a phone, on every route (`node scripts/tap-targets.mjs`): nav items, the theme control, the conference control, rows that are links and "more" links.
- The theme and conference controls are real `<button>`s with `aria-pressed` inside a labelled `role="group"`.
- Tables are real `<table>`s. The line score has a caption naming the game and uses `<th scope="row">` for team names.
- Every page has exactly one `h1`: the wordmark on Home, the page's title everywhere else. Two cases are known not to: Home's own error page (`apps/web/components/shell/error-page.tsx` drawn at `/`) has the wordmark and its title, and the scaffolding routes `/skeleton/dashboard` and `/skeleton/picks` have none.
- There's a skip link to `#content`. The live dot is `aria-hidden`, because "Live" is in the text.
- At 390px nothing scrolls sideways, on any route; the prototype is measured at a `scrollWidth` of 390.
