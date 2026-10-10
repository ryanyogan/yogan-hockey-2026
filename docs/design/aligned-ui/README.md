# Aligned UI implementation — issue #99

The visual target is the [direction Ryan approved on 2026-10-10](../navigation-direction.md), saved before production implementation. It supersedes variant C for this pass. The original app is the before baseline, not the current visual target.

## Capture coverage

Before: `bba6ce3`. After: the implementation on `issue-99-aligned-ui`. Both use recorded ESPN fixtures, local D1 sample picks seeded with “Seed picks, the final’s right”, favorite player `4024123`, America/Chicago time, and a 1000px viewport height. These are fixture screenshots, not current NHL scores or newly generated predictions.

Every public page template is covered, including the NHL teams query view, team nested routes, scheduled and final/replay game states, and the shared 404. The fixture-only live-state route adds overtime, shootout, intermission, postponed and final examples. The Family, Yogan and fictional-player routes are intentionally retired; the shell smoke verifies their 404 responses.

Each pair below links before → after. Images are full-page, so a long replay feed is intentionally tall.

| Page | 390 light | 390 dark | 1440 light | 1440 dark |
| --- | --- | --- | --- | --- |
| dashboard (`/`) | [before](before/dashboard-390-light.png) → [after](after/dashboard-390-light.png) | [before](before/dashboard-390-dark.png) → [after](after/dashboard-390-dark.png) | [before](before/dashboard-1440-light.png) → [after](after/dashboard-1440-light.png) | [before](before/dashboard-1440-dark.png) → [after](after/dashboard-1440-dark.png) |
| standings (`/nhl`) | [before](before/standings-390-light.png) → [after](after/standings-390-light.png) | [before](before/standings-390-dark.png) → [after](after/standings-390-dark.png) | [before](before/standings-1440-light.png) → [after](after/standings-1440-light.png) | [before](before/standings-1440-dark.png) → [after](after/standings-1440-dark.png) |
| teams (`/nhl?tab=teams`) | [before](before/teams-390-light.png) → [after](after/teams-390-light.png) | [before](before/teams-390-dark.png) → [after](after/teams-390-dark.png) | [before](before/teams-1440-light.png) → [after](after/teams-1440-light.png) | [before](before/teams-1440-dark.png) → [after](after/teams-1440-dark.png) |
| players (`/players`) | [before](before/players-390-light.png) → [after](after/players-390-light.png) | [before](before/players-390-dark.png) → [after](after/players-390-dark.png) | [before](before/players-1440-light.png) → [after](after/players-1440-light.png) | [before](before/players-1440-dark.png) → [after](after/players-1440-dark.png) |
| player (`/players/4024123`) | [before](before/player-390-light.png) → [after](after/player-390-light.png) | [before](before/player-390-dark.png) → [after](after/player-390-dark.png) | [before](before/player-1440-light.png) → [after](after/player-1440-light.png) | [before](before/player-1440-dark.png) → [after](after/player-1440-dark.png) |
| team (`/nhl/teams/21`) | [before](before/team-390-light.png) → [after](after/team-390-light.png) | [before](before/team-390-dark.png) → [after](after/team-390-dark.png) | [before](before/team-1440-light.png) → [after](after/team-1440-light.png) | [before](before/team-1440-dark.png) → [after](after/team-1440-dark.png) |
| roster (`/nhl/teams/21/roster`) | [before](before/roster-390-light.png) → [after](after/roster-390-light.png) | [before](before/roster-390-dark.png) → [after](after/roster-390-dark.png) | [before](before/roster-1440-light.png) → [after](after/roster-1440-light.png) | [before](before/roster-1440-dark.png) → [after](after/roster-1440-dark.png) |
| stats (`/nhl/teams/21/stats`) | [before](before/stats-390-light.png) → [after](after/stats-390-light.png) | [before](before/stats-390-dark.png) → [after](after/stats-390-dark.png) | [before](before/stats-1440-light.png) → [after](after/stats-1440-light.png) | [before](before/stats-1440-dark.png) → [after](after/stats-1440-dark.png) |
| scores (`/nhl/live`) | [before](before/scores-390-light.png) → [after](after/scores-390-light.png) | [before](before/scores-390-dark.png) → [after](after/scores-390-dark.png) | [before](before/scores-1440-light.png) → [after](after/scores-1440-light.png) | [before](before/scores-1440-dark.png) → [after](after/scores-1440-dark.png) |
| scheduled (`/nhl/games/401892449`) | [before](before/scheduled-390-light.png) → [after](after/scheduled-390-light.png) | [before](before/scheduled-390-dark.png) → [after](after/scheduled-390-dark.png) | [before](before/scheduled-1440-light.png) → [after](after/scheduled-1440-light.png) | [before](before/scheduled-1440-dark.png) → [after](after/scheduled-1440-dark.png) |
| replay (`/nhl/games/401803652`) | [before](before/replay-390-light.png) → [after](after/replay-390-light.png) | [before](before/replay-390-dark.png) → [after](after/replay-390-dark.png) | [before](before/replay-1440-light.png) → [after](after/replay-1440-light.png) | [before](before/replay-1440-dark.png) → [after](after/replay-1440-dark.png) |
| not-found (`/no-such-page`) | [before](before/not-found-390-light.png) → [after](after/not-found-390-light.png) | [before](before/not-found-390-dark.png) → [after](after/not-found-390-dark.png) | [before](before/not-found-1440-light.png) → [after](after/not-found-1440-light.png) | [before](before/not-found-1440-dark.png) → [after](after/not-found-1440-dark.png) |
| game-states (`/skeleton/live`) | [before](before/game-states-390-light.png) → [after](after/game-states-390-light.png) | [before](before/game-states-390-dark.png) → [after](after/game-states-390-dark.png) | [before](before/game-states-1440-light.png) → [after](after/game-states-1440-light.png) | [before](before/game-states-1440-dark.png) → [after](after/game-states-1440-dark.png) |

## Visual comparison and decisions

The accepted prototype and production share the white/near-white palette, dark alternative, square panel borders, compact visible navigation, wrapping scoreboard, and common container. The sidebar, hidden mobile menu, score carousel, Family view and fictional Rylan data are removed.

- Header: 56px desktop and 88px phone plus the bottom rule, with 44px navigation and theme targets. Header, scoreboard and main share 24px desktop and 12px phone outer gutters; intermediate widths use 16px. The container stops at 1440px.
- Scores: all nine sample games fit one desktop row and three phone rows. Each phone score entry is 43px plus its dividing rule; the grid scrolls with the document. No horizontal score carousel or overflow menu remains.
- Main panels: 16px gaps, common left/right boundaries, consistent headings and table rules. Desktop places Tonight/Favorites beside conference standings; phone stacks the panels.
- Game rows: 48px desktop, 56px phone. Away/home teams and scores share aligned columns; AI picks have a dedicated visible column. Team text is 14px on phone, record text 12px, with semibold abbreviations and tabular numeric text. Venue/TV is desktop-only to preserve room on phones.
- Theme: light defaults to `#fafafa`, white panels, `#18181b` text and `#52525b` secondary text. Existing dark preference is retained. Geist handles interface text; Geist Mono handles matchups/numbers.

Intentional differences from the limited sample:

- Production retains real team records, prediction record, favorite-player statistics, full standings controls and all 32 teams. Sample-only explanatory copy and fixed sample favorites are not shipped.
- The game page retains its interactive rink, timeline, replay transport, play feed and full matchup data. Its supporting panels, type and spacing follow the approved direction; the rink is not replaced by the sample’s simplified matchup card.
- A real prediction comes from the existing server/D1 path. Pending, unavailable and final-result behavior remains; “No pick” never invents a probability. Game details retain reasoning and key factors.
- Wide statistical tables may scroll inside their own table container on a narrow phone. The page and score grid must not scroll horizontally.
- Normal route navigation preserves the existing shared header DOM and sole scoreboard provider. vinext’s transition from an initially unknown/404 page to a normal route remounts the fallback shell; the persistence smoke therefore uses Home → Players. No framework rewrite is included in this design pass.
- The streamed/cache-miss score grid reserves a compact placeholder. An unknown unusually large slate may change initial height when it arrives; keeping all games visible is the approved tradeoff. The mounted shared grid persists on normal navigation.

## Verification

All 52 after captures completed with no horizontal page overflow and no uncaught page errors. All public pages returned 200 and the unknown route returned 404. At 390px the header content, ticker and main share x=12px / width=366px; at 1440px they share x=24px / width=1392px. Both themes measure identically. The measured header including its rule is 89px / 57px, and Tonight rows measure 56px / 48px. All five navigation links are 44px tall. Nine score links remain visible.

`before/manifest.json` records capture routes and HTTP status. `after/manifest.json` additionally records rendered container coordinates, header/row heights, text sizes, navigation targets, score count, page overflow and uncaught page errors. See the implementation PR for final automated check output.


Additional narrow-screen verification drove 0, 1, 8, 9 and 16 games through the existing Scoreboard socket at 320, 390, 768, 1024 and 1920px (25 combinations), with both teams carrying double-digit scores. Every case had no page, ticker or game-row overflow. At 320px the status column receives more room, score-strip spacing tightens without reducing its 12px text, and the rink's team stacks sit farther apart so the center date/time stays clear.

The loading score grid uses the same nine cells and responsive grid as the real typical slate, including intermediate-width wrapping. Other initial slate sizes retain the documented first-arrival height tradeoff.

Validation: typecheck and Biome passed; the full Vitest suite passed once (60 files, 672 tests); production build passed. All 14 existing browser smoke tests passed across the route suite and focused reruns: the retired ticker-link selector in Favorites was updated to the visible Scores navigation, and the shared-shell test verifies Home → Players preserves the header DOM. The two independent code-review axes found one tablet-placeholder mismatch and one typography gap; both were fixed and independently rechecked with no outstanding findings.

## Performance integration

Merged `f07b4bb` (#95 / #106) after the original comparison, preserving the cache and per-request improvements and nonblocking game-page Scoreboard reads. Its new live/game loading boundaries use the approved geometry. Family-only helpers and its cache policy remain retired. Four additional [loading captures](after/loading-manifest.json) cover `/skeleton/loading` at 390px and 1440px in both themes; no earlier capture exists for this new combined outline. All four have no page overflow or page errors, with live-placeholder rows measuring 56px / 48px. These supplement the original 104 before/after images.

Post-merge validation passed: typecheck, Biome, production build, 61 Vitest files / 693 tests, and the existing live/game/replay/player-search/player-profile smokes (six Playwright checks including setup). Both reviewers rechecked the merge overlaps without outstanding findings.
