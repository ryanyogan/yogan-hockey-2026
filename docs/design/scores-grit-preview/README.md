# On-demand scores proposal

**Design sample, awaiting approval.** [Issue #109](https://github.com/ryanyogan/yogan-hockey-2026/issues/109) remains open. This checkpoint changes no production code. Run instructions and interaction details are in the [prototype README](../../../prototypes/scores-grit-preview/README.md).

The proposal removes the permanent score strip. Scores remains a direct page link on mobile, with an optional desktop hover/keyboard preview. Mono headings, firmer panel rules and small red accents add restrained score-sheet character to the approved square layout. Games retain scheduled-time/id ordering and visible seeded AI predictions.

## Compare the same recorded fixtures

| View | Previous direction | Proposal |
| --- | --- | --- |
| Phone, light | [Before](before-390-light.png) | [Games](home-390-light.png) |
| Phone, dark | [Before](before-390-dark.png) | [Games](home-390-dark.png) |
| Desktop, light | [Before](before-1440-light.png) | [Games](home-1440-light.png) · [Scores preview](scores-preview-1440-light.png) |
| Desktop, dark | [Before](before-1440-dark.png) | [Games](home-1440-dark.png) · [Scores preview](scores-preview-1440-dark.png) |

Also captured: [phone Scores](scores-390-light.png), [phone game and AI pick](game-390-light.png), and Games at [320px](home-320-light.png), [768px](home-768-light.png), [1024px](home-1024-light.png), [1920px](home-1920-light.png).

## Measured and checked

The main content container moves from **y=222 to y=89 at 390px**: 133px reclaimed. At 1440px it moves from **y=106 to y=57**: 49px reclaimed. Header dimensions remain 89px phone and 57px desktop including borders. The score preview overlays content without moving it. [Before measurements](before-metrics.json) and [proposal measurements](qa.json) accompany the screenshots.

Root browser QA passed eight width/theme combinations: 320, 390, 768, 1024, 1440 and 1920px in light mode, plus 390 and 1440px in dark mode. There was no horizontal overflow or browser error. Home, Scores, Standings, Teams, Players and a game detail were checked. Navigation targets measure at least 44px; all nine game rows retain their AI-pick cells, including the explicit unavailable state.

The desktop preview contains all nine scheduled fixtures and stays within the viewport. Pointer travel into it, keyboard focus and Tab navigation, Escape dismissal, and continued navigation to Standings pass. Mobile Scores opens with one tap and no popover. The shared header DOM survives sample page navigation.

Targeted Biome, JavaScript syntax and whitespace checks pass. Independent Standards and Spec reviews report zero findings; the stable ordering and Games-title adjustment received a follow-up spec check. Production integration and its tests are a subsequent step after review of this proposal.
