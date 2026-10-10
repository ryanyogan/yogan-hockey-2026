# Accepted navigation and UI direction

Ryan approved this direction on 2026-10-10 after reviewing the interactive sample in light and dark, on phone and desktop. This is a saved design checkpoint for issue #99, not completion of the ticket or a production implementation.

## Layout and typography

- Use one shared container, at most 1440px wide. Header content, scoreboard and page panels share its exact left and right edges: 12px phone gutters, 16px intermediate, 24px desktop.
- Use square panels with visible borders, aligned headings, consistent internal rules and an 8px spacing scale. The dashboard places Tonight and Favorites beside the two conference standings on desktop; stacks them on mobile.
- Use Geist for interface text and Geist Mono for numeric data, matchups and the wordmark. Useful secondary labels are at least 12px, mobile team text 14px, and navigation at least 13px with 44px targets.
- Default to the nearly white light theme: `#fafafa` canvas, white panels, `#18181b` primary text and `#52525b` secondary text. Keep the selectable dark theme and use dark team marks where available.

## Navigation and scores

- Remove the sidebar and hidden mobile menu. Keep Home, Scores, Standings, Teams and Players visible on every page.
- Use a compact header: 56px desktop, 44px masthead plus 44px navigation on mobile, excluding the boundary rule. Theme selection is an accessible icon button.
- Show every scoreboard game without a horizontal carousel, hidden overflow or a “more” button. The nine-game sample uses one row on desktop and three columns on mobile, with 44px mobile cells. The score grid scrolls with the document.
- Keep game rows aligned across time, away team, home team and AI pick. Mobile rows are 56px rather than the earlier 85px. Desktop adds the arena column and uses 48px rows.
- Show each available AI pick as the selected team plus its chance of winning. The game detail carries reasoning and key factors. Failed picks say “No pick”; production must also preserve the existing pending, unavailable and final-result semantics.
- Remove Family and Rylan from the proposed navigation and dashboard. The saved prototype contains no Family or Rylan view.

## Saved sample

The self-contained [prototype](../../prototypes/navigation-preview/README.md) demonstrates Home, Scores, Standings, Teams, Players and game detail through hash navigation. Its shared shell stays mounted while page content changes. It uses recorded ESPN fixtures and the app's existing seeded sample predictions, not current scores or newly generated predictions. Teams and Players are deliberately limited sample views.

From the repository root:

```sh
python -m http.server 5191 --bind 127.0.0.1 --directory prototypes/navigation-preview
```

Open `http://localhost:5191`. No dependency install, build or backend is needed.

Representative accepted screenshots:

- [Phone, light](navigation-direction/home-390-light.png)
- [Phone, dark](navigation-direction/home-390-dark.png)
- [Desktop, light](navigation-direction/home-1440-light.png)
- [Desktop, dark](navigation-direction/home-1440-dark.png)
- [Phone game detail and AI pick](navigation-direction/game-401892449-390-light.png)

Browser QA checked 20 combinations covering 320–1920px, light/dark, the five destinations and game details, with no horizontal overflow or console errors. The shared container edges, visible scoreboard games, navigation targets, aligned game columns and sample AI states were inspected. This checks the prototype, not production behavior.

## Implementation constraints

Apply the accepted design using the existing server-rendered shared root `Shell` and nested layouts. Do not replace the app with the prototype's `innerHTML` or hash router. Keep navigation mounted across route changes and preserve its active-route state.

Use the existing `components/link.tsx` for intent prefetch on hover, focus and press. Keep the one Scoreboard provider/socket, cache policies, streaming boundaries and route loading/error behavior. Avoid new data reads merely to draw the shell. Public cached pages must remain independent of private account/session data; any future authenticated favorites belong behind an isolated personal-data boundary.

Production still needs feature parity, route-by-route responsive verification and the normal implementation checks and review. No production files were changed for this checkpoint, and no authentication was implemented.
