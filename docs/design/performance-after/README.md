# Performance comparison, issue #107

Fixture production builds, 390×900 and 1440×900. The baseline is the approved production UI before #107. Captures set the app's saved theme and assert the resulting HTML class. The final manifest records nine ticker games in every shot and 74 key-play rows for the 307-play replay.

Compared with `../performance-before` using ImageMagick's absolute error metric, the game, player and dashboard screenshots have **zero changed pixels**, in both themes at both widths. The team page intentionally stacks its identity and now panels at every width. `team-live-*` shows its live state; the header-to-tabs distance remains 305px on phones and 288px on desktop in scheduled, live and no-game states.

`docs/agents/build-notes.md` records the payload, navigation, dashboard A/B and deployed streaming/cache measurements, including their limits. `manifest.json` records the final capture DOM measurements; the baseline manifest explicitly distinguishes its same-run fixture/document counts from per-shot measurements.
