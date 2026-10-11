# Current direction: original Tonight ledger restored

Ryan's latest instruction in #121 is to return to the original design and retain the performance changes. This supersedes the October 10 navigation redesign (#99/#108), the canceled #119/#120 implementation directions, and the #117 broadcast prototype. Those saved prototypes are historical; they are not the current production target.

The visual source is `f07b4bb`, immediately before the navigation redesign. The original Geist Mono interface, 13px body, paper/slate themes, small ruled tables, unboxed uppercase sections, desktop sidebar, phone menu, text theme switch, horizontal score strip, and rink overlays are restored on the current application architecture. The operating-system theme is followed until a visitor chooses; existing saved choices still win.

## Restoration and retention matrix

| Area | Restored presentation | Current behavior retained |
| --- | --- | --- |
| Shared shell | 192px desktop sidebar, 44px phone header/menu, 16/24px page gutters | Server root Shell, one Scoreboard provider/socket, streamed initial slate, current intent-prefetch Link, skip link and public metadata |
| Home | Full-width Tonight ledger, real favorites, conference tables side by side | Start-time/id row order (#111), live updates, favorites hydration, available/pending/failed picks, pick record |
| Scores | Original dense six-column ledger and fixed-height horizontal strip with full-slate opener | Current Scoreboard data, favorite/status promotion on Scores and ticker, live/final states, local time and local team marks |
| Teams | Original records, schedule/results, roster and stats ledgers | Nested shared layouts and links; real roster/favorites; reserved full-width TeamNow space through scheduled/live/empty states; eight-row loading previews |
| Players | Original small identity, season, career and game tables | Search and real favorites; shared player layout; canonical latest/all-games paths and cleaned legacy redirects |
| Game | Original rink geometry, overlays, timeline, compact controls/feed/pick | Shared game layout and one stream, replay/playhead/selection across tabs, key/all plays, scoring, full AI reasoning/factors/outcomes, pending/unavailable states, six-row initial outline |
| Performance | Old strip's fixed-height fallback; original lightweight CSS and one font family | All Worker/cache policy, invalidation, joined data reads and bindings unchanged; no dashboard loading boundary; #94/#95/#103/#107 architecture retained |

## Intentional differences from the historical screenshots

- Family and the fictional player stay retired. The sidebar/menu has the five current destinations: Home, Scores, Standings, Teams, Players. Home keeps real Favorites in the first half-width row, followed by the two conferences.
- Home rows stay in scheduled order instead of promoting favorites/live games. Data also differs because recorded fixtures have evolved; colors and spacing are compared independently of fixture values.
- AI picks return to the original note cell on desktop and the status detail on phones and tablets (below 1280px). The original tablet note could collapse or truncate a probability behind the favorite label; retaining the detail at those widths keeps picks readable. Probability, pending state and full game-page explanation remain available. Failed/unavailable picks explicitly say “No pick”, preserving the newer feedback without an extra column.
- The team identity and now block stay stacked at every width, with a reservation as tall as the live ledger. Restoring the former side-by-side layout would undo #107's layout-shift fix.
- The newer accessible skip link remains. Existing nested game/player URLs and all nonvisual fixes remain; historical query tabs are redirected cleanly.

## Verification

Historical visual references are in `aligned-ui/before` (original ledger design, captured at `bba6ce3`). New screenshots in `original-restored` cover Home, Scores, Standings, Teams, Players, team schedule/roster/stats, player/latest and all games, scheduled game, replay/plays/scoring/pick and Not found, each at 390px and 1440px in light and dark. The manifest records fixture mode, route status, fonts, theme, overflow and browser exceptions. Historical Family content is not copied into new captures.

Behavior is checked by the existing route smoke tests: favorites persistence, real data, live updates, navigation prefetch, clean redirects, replay retention, theme/menu and TeamNow geometry. The strip's original wheel and hidden-entry unit tests were restored before implementation (five failures), then passed with the matching UI helpers. No cache/backend state or production data is rolled back.

Checks on the restored implementation: `pnpm typecheck` passed; `pnpm lint` passed (27 existing CSS specificity warnings in the unrelated saved #117 prototype); the full Vitest suite passed 707 tests in 62 files; the production build passed. All 15 existing Playwright checks passed after updating the restored cell/text expectations (13 initially, then the two corrected files and their seed setup passed). Tablet probability clipping is additionally checked in the existing Scores smoke. The 60 final route/theme/width captures report zero document overflow and zero browser exceptions. Home/Players captures wait for the actual fixture favorite to load.

`original-restored/team-geometry.json` checks the restored TeamNow reservation in both themes at 390/768/1024/1440px. Scheduled, live and no-game states have identical header-to-tabs offsets at each width: 251.5/251.5/232/208px respectively. The final build after the tablet-only detail adjustment also passes.
