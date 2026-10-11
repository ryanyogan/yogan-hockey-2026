# Ice time — design 02

This is the fresh direction requested in #117. Ryan rejected the #109 hover-scores/grit sample; that old sample is not awaiting approval. Production remains unchanged until this new direction is reviewed.

## Hockey identity

The reference is the visual language of arena broadcasts, dasher boards and scoreboards: square joins, hard rules, team marks, rink geometry, clear clocks, and blue/orange direction accents. Barlow Condensed makes the display typography feel like a sports headline; IBM Plex Mono keeps names, game states and numbers orderly. A single cut through the home display title supplies restrained distortion. Scores, clocks and descriptions remain undistorted.

Home has an oversized matchup anchored by the AI sample pick and a direct game entry, a small desktop favorites bench, and an aligned stable-order slate. It avoids a second permanent scores strip in the global header. On phone the featured match remains a deliberate three-column scoreboard; the slate becomes stacked team pairs with their own AI column. The light theme is warm ice and ink, retaining the navy broadcast scoreboard; dark is an arena control display with ice-white rink.

The new rink is the signature game element: a complete horizontal outline, quiet faceoff/zone geometry, explicit attack directions, and one numbered event at a time. The same number and visible selection identify its feed row. Saves use diamond markers, blocks squares, and other events circles; explicit event text and a selected-event legend carry the meaning independently of color. Player name, event type, distance, strength, period and clock sit outside the ice. The endpoint/line is a schematic from sample data, never a claim of tracked puck motion.

Desktop pairs the rink and feed. Phone presents scoreboard, game sections, rink, selected play, transport and feed in that order. Event buttons provide the large touch targets; the illustration does not require precise tapping. Useful attack-direction, legend and clock text is at least 12px at checked widths. Entrance and shot-line transitions are brief and finite; a reduced-motion preference removes them. Replay is explicit, advances through six discrete events, and never starts on page load.

## Decisions and limits

- Use an isolated static prototype so Ryan can judge a materially new design before production work. No changes to app routes, Agents, auth, native APIs or deployed styles.
- Keep one fixed, labeled sample date; date browsing, standings, full player/team pages and real live follow are outside this visual checkpoint. Research describes possible production patterns, not a promise that every referenced feature is demonstrated.
- Preserve stable start-time ordering when favorites change. The dedicated Favorites filter is a view, not a reordering rule.
- The current seeded Toronto 58% prediction is retained visibly; sample labels remain beside all probability values. Matchup numbers and events are illustrative.
- A responsive browser preview demonstrates the intended phone/PWA layout. There is no installability/offline claim.
- This is an intentional visual departure from the earlier variant C and #99 reference, authorized by the newer request. Captures are evidence of the new proposal, not a pixel-parity claim against those superseded visual targets.

## Review evidence

`home-{dark,light}-{1440,390,320}.png` and `game-{dark,light}-{1440,390,320}.png` show both primary screens. `verification.json` records no-overflow, theme/assets, target-height, rink-label-size and interaction checks. The automated interaction pass verifies stable game order, favorites persistence and empty state, touch selection and filters, keyboard replay scrubbing, tabs with retained selection, explicit play/pause/latest, reduced motion and theme persistence. This is prototype validation, not a production accessibility audit.
