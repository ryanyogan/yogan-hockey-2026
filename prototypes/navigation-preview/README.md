# Navigation and UI direction preview

Approved design checkpoint, 2026-10-10. See [the decision notes](../../docs/design/navigation-direction.md) and the linked screenshots.

Run from the repository root:

```sh
python -m http.server 5191 --bind 127.0.0.1 --directory prototypes/navigation-preview
```

Open <http://localhost:5191>. Home, Scores, Standings, Teams and Players are static sample pages sharing the same header and score grid. Open a game row to inspect its AI pick. The theme button remembers an explicit selection; first visit defaults to light.

## Data and assets

- `data.js` contains only the fields used from `packages/espn/fixtures/scoreboard.json` and `standings.json`. Dates and scores are recorded fixtures, not live data. The sample shows eight teams per conference and two recorded player profiles.
- AI values and reasoning reproduce `apps/web/lib/sample-picks.ts`: Toronto 58% in game `401892449`, the existing home-team sample formula for the other made picks, and a failed pick for `401892450`. Percentages belong to the picked team. No new prediction was generated.
- Team marks are copied from `apps/web/public/team-marks`; light and dark variants remain local.
- Geist UI was copied from the existing local asset `home/prototypes/home-daybook/assets/geist.woff2`; Geist Mono from `noodle-dashboard-prototypes/dist/geist-mono.woff2`. These are the Geist font family distributed under the SIL Open Font License. Both files are included here so the sample is self-contained.

This is a reviewable static prototype, not an app implementation. Its tiny hash router and template strings are preview scaffolding; production keeps the existing server layouts, data components and intent-prefetch links. No live backend, auth, actual favorites persistence or team/player detail pages are implemented here.
