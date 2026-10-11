# Ice time — fresh hockey design preview (#117)

A new art direction for review. This replaces the rejected #109 scores-hover/grit concept; it is not a production implementation or a deployable PWA.

Run from the repository root:

```sh
python -m http.server 5194 --bind 0.0.0.0 --directory prototypes/hockey-design-preview
```

Open http://localhost:5194/#home and http://localhost:5194/#game. The prototype has local fonts/assets, no build step, and no external API requests. The responsive layout is intended to show how an eventual PWA could look, but this sample has no manifest, service worker, install claim, authentication or live data.

Try the Home / Scores / My teams navigation, All / Live / Favorites filters, team stars, theme toggle, Game tracker / Matchup / AI pick sections, play selection, event filters, replay/pause, previous/next, latest sample, and keyboard-operated timeline. Browser-local theme and favorites persist. Home games keep their original start-time order.

All games, game states, event positions, times and statistics are illustrative, including the player/team combinations. The NSH–TOR 58% AI pick and its reasoning reuse the existing `apps/web/lib/sample-picks.ts` fixture; all probability labels say sample. The rink renders a single selected event and sample shot endpoint, not inferred continuous puck movement or a full history shotmap. The Latest button returns to the latest **demo** event. The only full tracker is NSH–TOR; other sample matches explain their scope and link to it.

The short entrance and selected-shot animations honor reduced motion. Replay starts only on an explicit button press and pauses when the page is hidden or the route changes. Events, filters and controls work with touch and keyboard. The rink itself is a semantic illustration selected through the adjacent feed, not a set of tiny tap targets.

## Direction and evidence

- [Design rationale and boundaries](../../docs/design/hockey-design-preview/direction.md)
- [First-party sports UI research](../../docs/design/hockey-design-preview/research.md)
- [Screenshot/check manifest](../../docs/design/hockey-design-preview/verification.json)

Team marks are copied from the app's existing ESPN-derived assets. Barlow Condensed and IBM Plex Mono are self-hosted with their OFL licenses in `assets/`.

## Reproduce validation

With the repository's dev dependencies available:

```sh
node --check prototypes/hockey-design-preview/app.js
pnpm exec biome check prototypes/hockey-design-preview
node prototypes/hockey-design-preview/verify.mjs
```

`verify.mjs` also accepts `PLAYWRIGHT_MODULE=/absolute/path/to/@playwright/test/index.mjs` for an existing installation in another worktree and `PREVIEW_URL` to choose the origin. It captures Home and Game once each for 1440, 390 and 320 widths, both themes, and performs one interaction pass covering the prototype's state transitions. It writes evidence to `docs/design/hockey-design-preview/`. No application tests or Cloudflare build/deploy are needed for these isolated static files.
