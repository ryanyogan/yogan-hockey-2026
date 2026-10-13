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
| A club's name on its page (`text-clubname`) | Newsreader, opsz 60 | 40 → 34px, less under 435px (30px at 390, 28px at 360) | 700 / 1.02 / -0.015em, no wrap |
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
| Heavy | `3px solid var(--rule)` | top of every story, top of the lower band, top of the sections' bar, top of the masthead's double rule (over the dateline) |
| Plain | `1px solid var(--rule)` | second line of the double rule, under the sections' bar, under the dateline at a desk, line-score frame, conference title underline, picks box |
| Hairline | `1px solid var(--rule-head)` | under column heads, under the phone's dateline |
| Dotted | `1px dotted var(--border)` | between agate rows (standings, line score, briefs) |

A live story swaps its heavy top rule to `--live`.

## Page anatomy (Home)

**Masthead** (the sections' bar is above the wordmark again, restyled, since Oct 12 2026; #216 had put the sections under it)
- The **sections' bar** is the first thing on the page at every width: a heavy rule, a 44px line, a plain rule (48px, `--section-nav`, which is also the page's `scroll-padding-top`). It is `position: sticky`: it stays at the top of the screen as the page scrolls, below the status bar of an installed site (`--safe-top`).
- At a desk (from `lg`, 1024px) the bar is one line in three parts: the **date** at the left (13px medium capitals, the dateline's type), the **sections** in the middle, and **Day/Night** at the right end.
- A **section** (Home, Scores, Standings, Teams, Players) is a cell of the bar: 14px semibold capitals tracked at .14em, 18px either side, a 13px hairline in `--border` between it and the next. What marks a cell is a 3px segment of rule along its foot, on the bar's own rule: `--kicker` for the current section, whose word is in `--kicker` too, and ink for the one under the pointer. The segment is always there and clear until wanted, so marking a cell moves nothing. Keyboard focus is the site's outline, drawn inside the cell.
- **Day/Night** are two more cells (12px, tracked at .14em): the theme shown is in ink over an ink segment, the other in `--label` until the pointer is on it.
- From `md` to `lg` the bar has no room for the date: the sections start it, Day/Night ends it, and the date is a line under the wordmark, as on a phone.
- Under the bar the **wordmark**, centred. It is Home's `h1` and a paragraph on every other page.
- Under the wordmark the **dateline**, between the double rule (3px, a 2px gap, 1px) and a plain rule: "Tonight: N games · X live · Y to come · Z final" (zero counts dropped) at the left and "Picks this season: R right, W wrong" at the right. The record is in the page's first HTML and is read again when a game goes final or a pick is made.
- The sections are written once. The date and the theme control are each written twice and drawn once (the date on the bar or under the wordmark; the control at the end of the bar or, on a phone, of the dateline), so one of each is `display: none` at any width. The `<header>` (the banner) holds the wordmark and the date under it; the bar and the dateline are its siblings in the page's column, as a sticky bar must be.
- A sixth section fits: with Picks (#218) the desk's sections are about 580px, which with Day/Night is 700 of the 720 the `md` breakpoint has. On a 390px phone six fit as they are (the narrowest cell 46px). On a 360px one they need a size down, 12px tracked at .04em with 2px either side, below 375px: the narrowest cell is then 44px and nothing scrolls sideways. `?picks=1` on the prototype draws all of it; the site has neither the link nor that rule until the page exists.

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

**Headlines from ESPN: the news** (#217).
- Under the briefs, in the briefs' form: a red label over a plain rule, then ESPN's NHL headlines in an `auto-fill, minmax(min(340px, 100%), 1fr)` list, rows parted by dotted rules. Six at most, in ESPN's order, which is three columns of two at a desk (the briefs have four: a headline is a sentence, not a score), two of three on a tablet and one column on a phone. The band's gap above it (44px, 32 on a phone).
- A row is the headline in the serif (Newsreader 700, 18px on 1.25, tracked -0.005em: it reads) over the day and time ESPN published it in agate (13px, `--aside`: "Mon Oct 12 · 5:18 PM", in the visitor's zone as every time on the site is). A headline with no time has no second line.
- The whole row is one link to the article on ESPN, in the same tab as the footer's credit is; its headline is underlined under the pointer. A row with its time is 60px tall or more, and no row is under 44px (a one-line headline with no time would be 42), so a thumb has it.
- **With no news the section is not drawn**: no label, no rule, no gap, and the lower band follows the briefs. That is ESPN's news not answering or having changed shape for more than six hours (until then the last list read is shown), never having been read, or being empty (`?news=0` on the prototype and on `/skeleton/dashboard`).
- **Where the written pieces will go** (#217, a later slice; nothing is drawn for them now): directly above this list, in a band of their own under the briefs, as two or three stories in the leads' grid (the heavy rule, a kicker saying a model wrote it and when, a serif headline that links to the piece's page, a deck). The headlines then read as the agate under those stories, as the briefs do under the leads.

**Lower band** (heavy rule above). Desktop: Standings (`flex: 999 1 560px`) beside an aside (`flex: 1 1 300px`).
- **Standings:** a serif title and a "Full standings" link. East and West agate tables sit side by side, each under a red label with an ink underline. Columns are Team (agate name), GP (in `--aside`), W, L, OT and **PTS** (bold).
- **The Picks:** a 1px ink box with a red label, the big serif record, and "Right on 67% of games this season. Two of three tonight." The second sentence only counts picked finals and spells out numbers up to ten.
- **Tonight at a glance:** three counts (Live, To come, Final) in serif, separated by hairlines.

**Footer:** a 1px ink rule over the ESPN credit and the family-project line in `--aside`.

## Phone (< 768px, Tailwind `md`)

| Desktop | Phone |
|---|---|
| The bar in three parts: the date, the sections, Day/Night | The bar holds the sections alone: the cells share its width (each its word and an even part of what is left, never under 44px), 13px tracked at .06em with 3px either side, no hairlines between; the current one's segment is as wide as its cell |
| Wordmark, then the double rule | The long date in a line under the wordmark (12px capitals in `--label`), then the double rule |
| Two-part dateline | One line: "3 games · 3 final · Picks 29–14", with one icon button at its right end that switches theme (moon by day, sun by night; named "Day" or "Night"). The line is 44px for the button, over a hairline |
| Story grid | Stories stacked; headline 34px |
| Briefs in 4 columns | One column |
| Headlines from ESPN in 3 columns | One column, each row a link at least 44px tall (60px with its time) |
| Standings beside the aside | Order: **Picks box** (row layout) → **Standings**; "Tonight at a glance" is hidden because the dateline carries it |
| East and West side by side | An Eastern/Western segmented control (`role="group"`, `aria-pressed`, 44px) shows one table at a time |
| `--gutter` 24px | 16px |

There is no sidebar, no bar above the wordmark and no bottom tab bar. Home's `h1` is the wordmark; every other page's is its own title.

## Other pages (not drawn: the system extended)

The prototype draws Home only. Every other route is built from the same tokens, type and rules, and the pictures kept in `docs/design/agate/` (`scores-*`, `standings-*`, `teams-*`, `team-*`, `game-*`, `player*`, `not-found-*`) are what was built.

- **Every page but Home** has a slim score strip under the masthead (13px Plex Condensed over a hairline, live scores in `--kicker`, club marks beside the abbreviations) and opens with a page title: a serif section title under a 3px rule (`PageHeader`), which is the page's `h1`.
- **Primitives.** `Ledger` is an agate table: 11px uppercase column heads over a hairline, dotted row rules, tabular figures, numbers right-aligned and the key number (PTS, a score) bold. A phone's row is 44px, not the prototype's 40.2px, so that a row can be pressed. `Section` is a red label over a 1px ink rule. Tabs (`UrlTabs`) are the phone's conference control: a ruled strip, the current cell filled. Badges and markers are the `mark`: 12px capitals in a 1px ink box, filled for the positive state.
- **Scores** (`/nhl/live`) is an agate ledger in sections (In progress, Upcoming, Final, Postponed), not briefs: status, away, home, scores, and a note with the pick and the arena. A final's pick carries the Right or Wrong mark, as a brief's does.
- **Standings** (`/nhl`) is one agate table per group in four views (league, conference, division, wild card). A team is its agate name and a link named by it; a won column is not coloured, and `--positive` / `--negative` are a goal difference's alone.
- **Teams** (`/nhl?tab=teams`) is a list in CSS columns read down each column, not a table.
- **A team's page** opens as a story does: the heavy rule, a red kicker (place, conference, division), the club's name as a serif headline with its mark, then Next Game, and Schedule, Roster and Stats as tabs. The name is always one line: it is the headline's size where the longest name ("Columbus Blue Jackets") fits the column at it with 2.5% to spare, which is from 435px up, and 8.45% of the column's width under that, as the wordmark shrinks under 390px (#225). In a schedule a win is bold and a loss grey. An opponent is its agate name on a phone and its whole name from `sm` up, in the Next Game card and in the schedule alike.
- **A game's page** opens with the same story a lead on Home is (kicker, headline, deck, line score with the club marks and the shots, pick line, TV), then the rink, the penalty box and the plays. The rink is ink on paper with the one red for a goal; saves, shots and hits are told apart by weight and filling, with a key under the ice, and no club's colour is used. The score is in the story's header and over the ice.
- **Players** is a search and agate rows; a player's page is a serif title with his position and club, and ledgers for his season, games and career.
- **Not found and error pages** are a page title and a sentence of serif prose with a way back; the page of last resort, for a request the site could not answer at all (`apps/web/lib/render-failure.ts`), repeats the wordmark and its double rule in a device's own serif.
- **An empty state** is a sentence of serif prose (`emptyProse`), never a box.

## Decisions

The answers to the six questions the design left open, and the calls made while building (#168 to #174). All shipped as written here.

1. **No bottom tab bar on a phone.** The sections' bar is the first thing on the page and sticks to the top of the screen, at a desk as on a phone.
2. **A slim score strip on every page but Home**, where the roundup and the briefs are the scores.
3. **No team marks on Home, in the standings or in any row.** Marks are drawn only in a team's headline, a game page's line score, and the score strip. The assets are still generated.
4. **The theme control says Day and Night**; next-themes' values stay `light` and `dark`.
5. **Leads and briefs follow `copy.js`**: at most three leads, live first, then next to start, then the latest finals, each group in the slate's stable order. A lead that goes final drops to a brief while three others are live or to come.
6. **Decks are data-derived only**: the sentences in `apps/web/lib/agate-copy.ts`, the port of `copy.js`. Standings places and streaks would be their own ticket.

Calls made while building:

- **The sections' bar is above the wordmark (Oct 12 2026).** #216 put the sections under the wordmark at every width; Ryan saw it live and said "lets go back to adding the header links above, just give them more style". The bar that had been there before #216 was plain small capitals at the left over a hairline, with two boxed buttons at the right. What was decided, and why:
  - *A bar with rules of its own*, heavy above and plain below, the width of the column. It is the heavy rule a story hangs from, so the bar reads as part of the page's structure and not as text floating over it.
  - *One line in three parts*: the date, the sections, Day/Night. The date balances the control at the other end, puts the sections in the middle over the wordmark, and is in view when the bar is stuck. It left the dateline, which now has two parts, one at each end.
  - *Cells, hairlines and a segment of rule.* The sections are larger and wider-tracked than they were (14px at .14em, from 13px at .1em) with a hairline between them. The current section keeps the one red and gains a 3px red segment on the bar's rule; the pointer gets the same segment in ink. No fills, boxes or pills.
  - *Day/Night speak the same language*: two cells, the theme shown in ink over an ink segment. The filled block they were would have been the heaviest thing on the bar.
  - *The bar is the sticky thing at every width*, as the sections' row was in #216. Being first on the page it never moves: it is 48px, 3px shorter than that row.
  - *On a phone too the sections are above the wordmark.* Five fit a 360px phone in cells of at least 44px, so there was no reason for the phone to differ. The cells share the bar's width, which makes the smallest ("Home") 50px at 360 where its word alone is 42. The date stays a line under the wordmark and the theme's button at the end of the dateline, since the bar is full.
  - *From `md` to `lg` the date gives way*: six sections, the date and Day/Night are about 830px of a 720px column, so there the bar is the sections and Day/Night, and the date is under the wordmark.
  - *Picks (#218) is a sixth cell*, after Players. No link was added. Six fit at a desk and on a 390px phone unchanged; a 360px phone needs the size down described above, which the prototype has (`.sections--six`) and the site will take with the link.
  - *Kept from #216*: the sections written once, one `nav[aria-label="Site"]`, the wordmark as Home's `h1`, the long date on a phone, `scroll-padding-top` at every width.
- **Home.** The standings' team names are plain text on a phone (40px rows, as drawn) and links from `md` up. Home has no "pick pending" and no "all scores" link. Favorites are not drawn anywhere: the prototype's Favorites block and the site's hearts were removed in #223, until the site has Accounts (#132, #133). The Picks box is not drawn before any pick is decided. Day `--positive` is `#166534`, a step darker than the tuned ledger's green, for AA on the row under the pointer.
- **ESPN's headlines on Home (#217).** Between the briefs and the lower band, not in the aside: six headlines in a 300px column would run twice the height of the standings beside them. A list under a label, like the briefs, not a band with a serif title: the lower band's heavy rule and "Standings" follow at once, and two titled bands in a row made the news as loud as the games. Videos ("Media" in ESPN's list: highlights and clips) are left out, since a headline list is for reading; recaps, previews, stories and news are all kept, in ESPN's order. The list is ESPN's own and is not narrowed to the league: a college coach's hiring and a fantasy column were in it on the day it was recorded, and they are listed as ESPN lists them. No description, byline or picture is drawn. While ESPN's news cannot be read the last list is shown for six hours and then the section goes. The label names ESPN, so there is no separate credit or "more" link.
- **The game page.** No club colours on the rink: goals are red, and saves, shots and hits differ by weight and fill, with a key. The score appears in the story header and over the rink.
- **The NHL routes.** Scores is an agate ledger, not briefs. Teams is a CSS-column list. Wins are bold and losses grey. A standings row's link is named by the agate name.
- **The dateline's record of the picks** is read with the page and again whenever the Scoreboard reports a final or a new pick, and not otherwise. (While whole pages were cached it could be about ten minutes old; they no longer are: ADR 0009.)
- **No live row is tinted**, and `--live-tint` was removed.
- **The font swap may move a word, not the page**: `scripts/font-load.mjs` allows 0.05 of layout shift and 32px at the swap, and from #183 every load it measures was inside that (at most 0.006 and 16px with the fonts held two seconds). From #223 to #225 one was not: a team's page at 390, where "Toronto Maple Leafs" had the whole column without the heart, fitted one line in the fallback and took two in Newsreader, and the page under it moved 35px. A club's name is now one line by rule (`text-clubname`), and the page moves 5px. Until a face arrives its text is drawn in a local face resized to it, with a regular and a bold cut each (`packages/ui/src/font-fallbacks.css`): Times New Roman and Arial on iOS, macOS and Windows, Liberation Serif and Liberation Sans on Linux, Noto Serif and Roboto on Android. The script sets type unhinted, as a phone does. With hinting on, which is desktop Chrome on Linux, three loads still move more than 32px: the player's page at 1440 (37px) and the game page at 390 (62px) and 1440 (65px). No real iOS or Android device has been measured.
- **The standings' four view tabs on a phone** are tracked at Tailwind's `tracking-wider` (.05em), not a theme token: at `tracking-head` (.1em) the strip is 3px wider than a 360px phone (measured: 329 in 326).

## Accessibility

- All text roles pass AA in both themes, on the page and on the row under the pointer (table above; held by `packages/ui/src/theme.test.ts`). Rules are decorative.
- Tap targets are at least 44px on a phone, on every route (`node scripts/tap-targets.mjs`): nav items, the theme control, the conference control, rows that are links (a headline from ESPN among them) and "more" links.
- The theme and conference controls are real `<button>`s with `aria-pressed` inside a labelled `role="group"`.
- Tables are real `<table>`s. The line score has a caption naming the game and uses `<th scope="row">` for team names.
- Every page has exactly one `h1`: the wordmark on Home, the page's title everywhere else. Two cases are known not to: Home's own error page (`apps/web/components/shell/error-page.tsx` drawn at `/`) has the wordmark and its title, and the scaffolding routes `/skeleton/dashboard` and `/skeleton/picks` have none.
- There's a skip link to `#content`. The live dot is `aria-hidden`, because "Live" is in the text.
- At 390px nothing scrolls sideways, on any route; the prototype is measured at a `scrollWidth` of 390.
