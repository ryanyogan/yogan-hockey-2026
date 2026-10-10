# On-demand scores + score-sheet character

Reviewable proposal for [issue #109](https://github.com/ryanyogan/yogan-hockey-2026/issues/109), based on the approved navigation design. This is an isolated static sample. Production and the previous approved sample remain unchanged.

From the repository root:

```sh
python -m http.server 5193 --bind 127.0.0.1 --directory prototypes
```

- Proposal: <http://localhost:5193/scores-grit-preview/>
- Previous direction, same fixtures: <http://localhost:5193/navigation-preview/>

## Scores when wanted

The permanent nine-game strip is removed. Home opens with Games and its schedule; Scores remains a visible, ordinary link on every page. Every game list, including the preview, uses scheduled start time then game id. Status, favorites and changing live details never reorder a game. The seeded AI values keep their original fixture indices.

- **Phone / touch:** tap Scores once to open the full scores page. No popover, hidden menu or second tap.
- **Desktop pointer:** hover Scores for a boxed, three-column preview of all nine recorded games. Move into the panel to open a matchup or choose All scores. A short pointer-leave delay and invisible gap bridge keep the preview steady.
- **Desktop keyboard:** focus Scores to open the same preview. Enter follows the normal Scores link; Tab moves through the game links and All scores. Escape closes the preview and returns focus to Scores when focus was inside it. It remains closed until the pointer leaves/re-enters or focus leaves/returns. There is no focus trap.
- Navigation and the theme toggle retain their DOM nodes across sample page changes. Only the main content changes. The mobile header is still two 44px rows and the desktop header is still 56px, plus its border.

Removing the strip brings the page heading up by **133px on a 390px phone** and **49px at 1440px desktop** compared with the previous saved sample. The preview floats over content, so opening it moves nothing. These are the prior strip's dimensions, to be verified with the screenshot report.

## A little of the original character

The original variant C used monochrome ledger typography, uppercase labels and fine rules. This proposal borrows those cues without restoring its small body text or sidebar:

- Monospace page and section headings, plus table utility labels; Geist body and navigation remain readable.
- Firmer top rules on square panels, aligned to the same existing edges and gutters.
- A small red slash, active navigation rule and page-heading marker. No distressed texture, extra font, animation or dependency.
- Light canvas remains almost white with dark text. Dark mode keeps the existing blue-black palette and readable muted text.
- AI picks remain in a dedicated column on phone and desktop, with their original sample semantics and game-page reasoning.

## Data and scope

All data, team marks and fonts are reused by relative URL from `../navigation-preview/`; there are no copied asset bundles. Its [README](../navigation-preview/README.md) records provenance. The nine games are the recorded October 6 scheduled fixtures, so the popover explicitly says **Recorded sample** and **Scheduled**, never “live.” Times are Central time, as in the earlier sample.

AI values reproduce the existing seeded sample: Toronto 58% for `401892449`, the home-team sample formula for other made picks, and No pick for failed game `401892450`. These are sample predictions, not new model output. Home, Scores, Standings, Teams, Players, and game details are reviewable. Team/player detail pages, live updates and actual favorites persistence are outside this static sample.

The hash router is preview scaffolding only. A subsequent approved implementation must use the existing server layouts, intent-prefetch Link, shared score source, and one Scoreboard socket. Scores must remain an ordinary link with a mobile one-tap path.
