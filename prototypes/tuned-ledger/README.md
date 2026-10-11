# Tuned ledger prototype (#128)

Throwaway. Home, a live game and Standings in the ledger design as it is today, with only what #128 lists changed, for Ryan to approve in #129 before any production UI ticket starts. What changed and why, the contrast measurements and the screenshots are in [docs/design/tuned-ledger.md](../../docs/design/tuned-ledger.md).

## Run it

From the repository root:

```sh
pnpm prototype:look
```

It prints two addresses: one for this computer and one to open on a phone on the same Wi-Fi. It listens on port 5128 (`PORT=5302 pnpm prototype:look` for another). It is Node's own HTTP server over this folder: no install, no build, nothing from the app. `node prototypes/tuned-ledger/serve.mjs` does the same without pnpm.

## Using it

- The tab bar (phone) or the sidebar (desktop) moves between the screens. **Scores** opens the live game. Teams and Players are placeholders.
- The purple bar is the prototype's switcher, not part of the design. Its arrows (or the ← → keys) step through the nine typeface and weight combinations; tapping its label opens every option: typeface, weights, theme, tuned or today's colours, reduced motion. "Tuck it away" shrinks it to a button.
- On the live game, the dashed box replays the goal for either team, a shot that misses and a save. Tapping any play in the list replays that play.
- Every choice is in the address, so a link reproduces what is on screen: `?font=geist|jetbrains|plex&weights=regular|medium|heavy&theme=light|dark&colors=tuned|today&motion=reduce|full&chrome=0&play=goal|goal-home|shot|save#/home|game|standings`. `chrome=0` hides the switcher and the replay box.

## What is in here

| File | What it is |
| --- | --- |
| `serve.mjs` | The one-command server, bound to every network interface. |
| `index.html`, `style.css`, `app.js` | The three screens and the switcher, drawn by template strings. |
| `rink.js` | The rink SVG, `describe` (a play to an animation description, pure) and `animate` (GSAP plays a description). |
| `tokens.js`, `contrast.mjs` | Today's and the tuned colours, and the script that measures their contrast. |
| `data.js`, `build-data.mjs` | The fixture data the screens draw, and the script that rebuilds it from `packages/espn/fixtures`. |
| `capture.mjs` | Takes the screenshots in `docs/design/tuned-ledger` (needs the repo's Playwright). |
| `vendor/gsap.min.js` | GSAP 3.15.0 core, unmodified from the `gsap` npm package. |
| `assets/` | Three typefaces (SIL Open Font License, texts beside them) and the site's own team marks. |

## Data

- The slate, records, venues and standings are `scoreboard.json` and `standings.json`. The recorded slate is nine games that have not started, so `build-data.mjs` lays invented scores and clocks over seven of them to show final, live and scheduled rows together. Picks are the sample values of `apps/web/lib/sample-picks.ts`.
- The game is `summary-401803652.json` (Dallas at Buffalo, recorded as a final), stopped at Esa Lindell's goal 4:24 into the 2nd. Every play, coordinate, scorer and score is ESPN's.
- The favorite is the recorded Auston Matthews line from the existing dashboard screenshots.

## Not production code

No tests, no framework, a hash router and `innerHTML`. Production keeps its server components, `Ledger` components and theme tokens; the tickets after #129 rebuild this look there and take only the measurements, colours and the `describe`/`animate` split from here.
