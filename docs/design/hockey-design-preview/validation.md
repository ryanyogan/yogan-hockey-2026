# Prototype validation — #117

2026-10-11, local Chromium against `http://localhost:5194`. The self-contained preview performs no production calls or writes.

- **88 assertions passed** in `prototypes/hockey-design-preview/verify.mjs`; no browser exceptions.
- **12 full-page captures:** Home and Game, dark/light, 1440/390/320px. Every captured screen has no horizontal overflow, all local image assets loaded, buttons at least 44px tall, and the actual requested theme applied. Game direction labels, legend and clock measure at least 12px at every width.
- **Interaction pass:** stable game order, live/favorites filtering, favorite persistence and empty state, linked touch selection, event filters, keyboard timeline, AI/matchup sections, retained selection across sections, discrete replay advance, pause, latest sample, keyboard navigation, theme persistence and reduced-motion styles. The final pass also checks skip-to-content from Game/My teams and BOS-only/empty Home favorites with retained keyboard focus.
- **Additional 320px checks:** Scores, My teams and the secondary sample-game summary fit without horizontal overflow.
- **Visual inspection:** desktop Home/Game dark, light desktop Home, light phone Game and dark 320px Game. The root orchestrator independently inspected first desktop/phone captures; final captures replace those early drafts.
- `node --check prototypes/hockey-design-preview/app.js` passes. Biome formatting/check passes with 27 non-blocking `noDescendingSpecificity` warnings; these concern the prototype's independent component selectors and responsive overrides. No linter configuration or production code was changed to suppress warnings.

The browser runner originally used a synchronous visibility check immediately after a hash navigation; the check raced the native hashchange event. Waiting for the destination rink fixed the harness, and the complete pass above succeeded. This did not require an application interaction fix.

The static prototype has no TypeScript, app dependency, backend or Cloudflare integration changes; the production app suite and deploy were not run. This evidence verifies the prototype's reviewable interactions, not production behavior, actual live coverage, installability, or a formal accessibility audit.

Independent review found two prototype defects before finalization: the hash router consumed the skip-link anchor as a route, and the Home bench still showed the two initial favorites. The skip link now preserves the current route and focuses its main content; the bench now derives from selected favorites, caps its compact display at three with an explicit total, and provides an empty state. The final 88-assertion pass includes both regressions.
