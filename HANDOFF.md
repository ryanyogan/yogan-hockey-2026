# Handoff: redesign yogan-hockey-2026 in the Agate look

**For:** Claude Code, working in `ryanyogan/yogan-hockey-2026`.
**From:** the design session of Oct 11 2026, where Ryan picked direction **B · Agate** (newspaper sports section) out of three and approved the desktop and phone artboards.

## Kickoff prompt (paste into Claude Code)

> Read `HANDOFF.md`, `docs/design/agate.md` and `prototypes/agate/README.md`, then run `pnpm prototype:agate` and look at it in both themes at 390 and 1440. We're replacing the tuned-ledger look with Agate across the whole site. Follow AGENTS.md's workflow: open the issues in the "Tickets" section of HANDOFF.md, and work them in order, one worktree and PR each. The prototype is the pixel target; the open questions in HANDOFF.md have recommended answers, so use those unless I've said otherwise and note them in each PR.

## What's in this bundle

Copy it into the repo root. The paths line up with the repo's.

```
HANDOFF.md                         this file (delete after the epic lands)
docs/design/agate.md               the spec: tokens, type, rules, anatomy, phone, other pages, a11y
docs/design/agate/*.png            8 screenshots: {tonight,busy} × {390,1440} × {light,dark}
prototypes/agate/                  static prototype, pixel target (pnpm prototype:agate, port 5129)
  copy.js                          every sentence as pure functions: port these, with tests
  style.css                        the look; tokens use theme.css role names
  data.js app.js index.html serve.mjs capture.mjs README.md
```

Add to the root `package.json`: `"prototype:agate": "node prototypes/agate/serve.mjs"`.

## AGENTS.md: replace the "Pixel perfect" paragraph with

> - **Pixel perfect**: the visual target is the **Agate prototype** in `prototypes/agate` (`pnpm prototype:agate`), which Ryan approved on Oct 11 2026; it replaces the tuned ledger. `docs/design/agate.md` describes it and `docs/design/agate/` holds its screenshots. Finish any UI ticket by comparing screenshots against it, in light and dark and at phone and desktop widths. Pages the prototype doesn't draw extend its tokens, type and rules as `docs/design/agate.md` § "Other pages" says. The sentences the site prints follow `prototypes/agate/copy.js`. The Parity Reference is still the target for features and behaviour only.

Also update the comment header of `packages/ui/src/theme.css`, which currently cites the tuned ledger. Point `scripts/look-shots.mjs` and `look-compare.mjs` at port 5129 and the new screenshot names, or add an `agate` mode to them.

## What changes structurally

| Today | Agate |
|---|---|
| Desktop sidebar (SITE nav, TONIGHT counts, LIGHT/DARK) | **Gone.** The nav moves to the masthead utility bar, the counts to the dateline, the theme control to the utility bar. |
| Phone top bar + bottom tab bar | Phone masthead: date + theme icon, wordmark, a horizontal-scroll section nav and a one-line dateline. |
| Score ticker across the top | Not on Home: the roundup and briefs *are* the scores. Other pages: see Q2. |
| Tonight table (one row per game) | **Leads** (up to 3 full stories) + **briefs** ("Around the league"). |
| "picks: 29 right, 14 wrong" line | The dateline, plus the **The Picks** box ("29–14 · Right on 67%… Two of three tonight."). |
| Standings, both conferences | Agate tables side by side on desktop; Eastern/Western control on phone. |
| Geist Mono everywhere | Newsreader (serif) + IBM Plex Sans Condensed. |
| Slate/paper palette | Newsprint day/night with one red (`--kicker`). |
| Team marks in every row | Not on Home or in standings (Q3). |

## Data the design needs (not on the client today)

- **`location` and `shortName` per side.** Headlines use nicknames ("Kraken 5, Capitals 3"); agate uses locations ("Seattle"). `Team` has both, but `ScoreboardSideSchema` (`packages/schemas/src/scoreboard-state.ts`) drops them. Add both there and in `scoreboardGame` in `apps/web/agents/slate.ts`. Agate names need one override where two clubs share a location: "N.Y. Rangers" / "N.Y. Islanders" (see `TEAMS` in `prototypes/agate/data.js`).
- **Per-game pick outcome on Home.** `pickOutcome` already exists in `packages/schemas/src/prediction.ts` but is only used on the game page. Use it on Home stories and briefs, keeping `data-slot="pick-outcome"`.
- **Tonight's pick tally** ("Two of three tonight"): picked finals in the slate. Derive it client-side.
- **Start time** for scheduled games in the viewer's time zone, as the site already formats it.

## Open questions, with recommended answers (note the answer in the PR)

1. **Phone bottom tab bar.** The design has none; nav sits under the masthead. *Recommended:* follow the design, but make the section-nav row `position: sticky; top: 0` on phone so it stays reachable in the installed PWA. Ask Ryan in the PR if it doesn't feel right on a phone.
2. **Score ticker on pages other than Home.** *Recommended:* keep a slim agate strip on non-Home pages: 13px Plex Condensed, a hairline under it, live scores in `--kicker`. Drop it on Home.
3. **Team marks.** *Recommended:* none on Home or in standings, which are pure agate. Keep them on team and game page headers at `size="header"`. Keep generating the assets.
4. **Theme labels.** The design says **Day / Night**. *Recommended:* use those labels; the values stay `light`/`dark` in next-themes.
5. **Leads/briefs rule.** At most 3 leads: live, then next to start, then latest finals. Lists keep stable order (`copy.js` → `leadsAndBriefs`). *Recommended:* ship as is and check it against `docs/design/stable-game-order`.
6. **Deck copy.** The Oct 11 artboards had hand-written decks ("first in the East", "still looking for its first win"). *Decided:* ship only the data-derived sentences in `copy.js`. Richer facts such as standings position or streaks can come later as their own ticket, if each is computed.

## Tickets (one issue → one worktree → one PR, in this order)

1. **Tokens and fonts.**
   - Swap the `theme.css` values per `agate.md` § Tokens. Add `--kicker`, `--font-serif` and `--font-agate` to `@theme inline`, plus `font-serif`/`font-agate` utilities.
   - Load Newsreader (with `opsz`) and IBM Plex Sans Condensed (400–700) via `next/font/google` in `app/layout.tsx`, and drop Geist Mono from the page. The `geist` package stays for `scripts/app-icons.ts` unless the icon is redrawn.
   - Change `THEME_COLORS` and `INK_COLORS` in `lib/install.ts`, run `pnpm app-icons`, and update the theme-color expectations in `lib/install.test.ts` and `e2e/shell.spec.ts`.
2. **Copy rules.** Port `prototypes/agate/copy.js` to `apps/web/lib/agate-copy.ts`. Write Vitest tests first, from the table below. Add `location` and `shortName` to the scoreboard side schema and translator.
3. **Shell → masthead.** Replace the sidebar, phone top bar and tab bar (`components/shell/*`) with the masthead: utility bar, wordmark, dateline, phone layout, and the Day/Night control (`role="group"` named "Theme"). Do the footer too. Keep `data-slot`s that tests rely on where the thing still exists. Update `e2e/shell.spec.ts`.
4. **Home.** Roundup stories (all four states), briefs, lower band (standings with the phone control, The Picks, glance, favorites). Keep `data-slot="picks-record"` on the record. Update `e2e/dashboard.spec.ts` and `e2e/picks.spec.ts`.
5. **Primitives → agate.** Restyle `packages/ui` (`ledger`, `section`, `url-tabs`, `badge`, `marker`, `nav-item`, `button`, `skeleton`) so every other route follows. Also restyle `components/route-skeletons.tsx`.
6. **Other routes.** Do Scores, Standings (full), Teams, Players, the game page (header, pick, rink colors) and the team page, extending the system per `agate.md` § Other pages. Update `nhl`, `live`, `team`, `game-page` and `replay` specs where structure changes.
7. **Docs.** Update AGENTS.md (text above), `docs/design/agate.md` (move "superseded" onto `tuned-ledger.md`), build notes (the font loading, the schema change, gotchas) and GLOSSARY.md if "dateline", "lead" or "brief" enter the code's vocabulary.

### Copy test cases (outputs of `copy.js` on the prototype's data)

| Game | kicker | headline | deck | outcome |
|---|---|---|---|---|
| SEA 5 @ WSH 3, final, pick WSH | Final · Capital One Arena | Kraken 5, Capitals 3 | The Kraken win on the road and move to 4-2-0. The Capitals fall to 3-2-0. | wrong |
| VAN 2 @ NYR 6, final, pick NYR | Final · Madison Square Garden | Rangers 6, Canucks 2 | The Rangers win at home and move to 5-2-0. The Canucks fall to 2-5-0. | right |
| NSH 3 @ TOR 4, Final/OT, pick TOR | Final/OT · Scotiabank Arena | Maple Leafs 4, Predators 3 | The Maple Leafs win at home in overtime and move to 1-2-0. The Predators fall to 1-1-0. | right |
| OTT 4 @ DET 1, final, no pick | Final · Little Caesars Arena | Senators 4, Red Wings 1 | The Senators win on the road and move to 2-0-0. The Red Wings fall to 0-2-0. | — |
| UTA 2 @ NJ 2, live 3rd 18:44 | Live · 3rd 18:44 · Prudential Center | Mammoth 2, Devils 2 | Tied 2–2 in the 3rd. | — |
| MIN 3 @ BUF 3, live OT 2:10 | Live · OT 2:10 · KeyBank Center | Wild 3, Sabres 3 | Tied in overtime. | — |
| NYI 1 @ NYR 2, live 3rd 9:02 | Live · 3rd 9:02 · Madison Square Garden | Islanders 1, Rangers 2 | The Rangers lead by 1 in the 3rd. | — |
| VGK @ SEA, 8:40 PM | 8:40 PM · Climate Pledge Arena | Golden Knights at Kraken | The Golden Knights (2-1-0) visit the Kraken (2-1-0). | — |

On the busy slate the leads are the UTA–NJ, MIN–BUF and NYI–NYR live games. The briefs are, in order: Montreal 3, Carolina 2 · Toronto 4, Nashville 3 · Ottawa 4, Detroit 1 · St. Louis 0, Chicago 1 · Vegas at Seattle · Florida at Los Angeles.

## Done means

- Home matches `docs/design/agate/home-*` at 390 and 1440 in both themes, compared with the look scripts.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm test:e2e` all pass. Every e2e expectation that changed is changed on purpose and listed in the PR.
- There's no horizontal scroll at 390, every tap target is at least 44px, and every text role passes AA in both themes (values in `agate.md`).
- The installed PWA shows the new theme colors and icons.
