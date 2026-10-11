# Sports interface research for the hockey preview

Reviewed 2026-10-11 for issue #117. Scope: three publishers, their current published App Store screenshots, and first-party hockey pages. Screenshots were downloaded through Apple's public lookup API and visually inspected; these are publisher-selected promotional examples, not a hands-on audit of installed apps. No reference artwork is included in the prototype. Recommendations below are design judgments, not measured usability findings.

## Observed patterns

| Reference | Evidence inspected | Useful lesson for Yogan Hockey |
| --- | --- | --- |
| NHL | The Gamecenter screenshot places large scores either side of a central period/clock, with shots below the team marks. Summary, Box Score and Play-by-Play are adjacent tabs. Scoring events are grouped by period. [Publisher screenshot](https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/47/16/9b/47169ba1-711e-591f-cf41-43f45aea9752/Gamecenter-iPhone-EN.png/640x960bb.jpg), [official listing](https://apps.apple.com/us/app/nhl/id465092669). | Establish one stable score hierarchy. Keep game state beside the score and give detailed statistics their own section. |
| ESPN | The Scores screenshot uses two aligned team rows with a separate status column, sports chips, and a Favorites group. The Gamecast screenshot places the score above detail tabs, then a single play visualization and a descriptive card. [Scores screenshot](https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/07/7e/1c/077e1cfe-e584-e3d3-cea3-d391b5aa41ce/iPhone5.5_08.jpg/392x696bb.jpg), [Gamecast screenshot](https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/fc/31/2a/fc312acd-84bd-4c51-3939-54b68a8f58f0/iPhone5.5_07.jpg/392x696bb.jpg), [official listing](https://apps.apple.com/us/app/espn-live-sports-scores/id317469184). | Align comparable values, keep status distinct, and connect spatial action to readable text. The inspected Gamecast example is football; the interaction structure transfers, its field geometry does not. |
| Sofascore | Its Feed screenshot contains a hockey shotmap: full horizontal rink, sparse markers, direction arrow above, and player/game identity outside the map. A separate match screenshot places a compact momentum chart above timed events. [Hockey screenshot](https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/25/56/e4/2556e4af-34a0-ca1f-e953-81ead83f74eb/EN-US_General_screenshots-6_9_-07.jpg/640x960bb.jpg), [match screenshot](https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/b9/dc/be/b9dcbe07-50f8-c33a-94c1-22a0a6ab397d/EN-US_General_screenshots-6_9_-02.jpg/640x960bb.jpg). Its hockey webpage exposes All / Live / Finished / Upcoming separately from Favorites. [Official hockey page](https://www.sofascore.com/ice-hockey). | Keep rink geometry quiet, show direction explicitly, place long labels outside it, and separate time/status navigation from personal filtering. |

Sofascore announces richer NHL event mapping and shot data as a progressive 2026–27 rollout. This is product direction, not evidence that every announced feature is available or that Yogan's ESPN source can supply equivalent data. [First-party announcement](https://www.sofascore.com/news/sofascore-and-national-hockey-league-announce-multiyear-global-partnership).

## Recommended interface contract

- **Scores first:** team identity, score, period/clock, then shots and strength. Use tabular numerals so updates do not shift columns. Keep the latest score visible without hover.
- **Explicit navigation:** a visible date with previous/next controls and Today; separate All / Live and Favorites controls. Changing date must not silently imply a different favorites mode.
- **Rink and plays together:** desktop pairs a generous rink with an event list. Phone order is score, short filters, full-width rink, selected event, then chronological events. Give period and event-type filtering a clear scope.
- **Readable rink:** thin blue/red geometry, one clear selected marker, subdued historical markers, separate attack direction and legend. Use shape plus color for event meaning. Keep player names, coordinates and full descriptions off the ice. For dense areas, let the event list select individual plays.
- **Touch parity:** tapping a marker or event row selects the same play. Hover can supplement that action. Provide generous touch areas around small markers and visible selected/focus states; use an approximately 44 px control-height target as a design choice. No essential information depends on hover or precise pointer movement.
- **Live behavior:** distinguish live following from reviewing an older event. A visible Return to live action restores follow mode; new events should not steal a reader's selected historical play. Label fixture data honestly and avoid invented continuous puck movement between observed events.

## Original art direction

The organization above is reusable; the visual identity should be ours. Build an intimate hockey publication around sharp dividers, deliberate whitespace, oversized display typography and compact mono timing/index labels. Keep score numerals and body copy undistorted. Use restrained typographic displacement or distortion in the masthead and transitions, with short event-driven motion and a reduced-motion equivalent. Avoid all-over grit, constant blinking, and decorative graphics competing with rink markers.

Treat the rink as the signature object: large, precise, calm, and immediately legible in both themes. On phone, preserve its full outline rather than cropping it into an abstract decoration. Dark mode can feel like an arena control display; light mode should retain the same hierarchy with an ice-toned canvas and crisp ink. Do not infer a successful mobile layout from a scaled desktop screenshot: inspect both widths with the actual selected-event panel open.

## Limits

This review confirms published visual patterns, not accessibility compliance, performance, actual gesture behavior, or sticky-header behavior in those apps. ESPN's live scoreboard blocked automated access; its publisher screenshots supplied the visual evidence. None of the references establish that a particular style or navigation pattern is optimal for this audience. The preview should test these recommendations through real date, filter and event-selection interactions.
