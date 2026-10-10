# Stable home game order (#111)

The home slate now follows scheduled start time, with game id breaking equal-time ties. Live status, scores and favorite changes update existing rows without promoting them. An actual schedule time change may change chronological position. The heading is now “Games”.

This is a behavior correction to the approved UI. The unapproved score-preview/grit sample (#109) is separate; the current production score strip is retained here.

## Visual comparison

The before set is the approved UI in `../aligned-ui/after/`, based on the design shipped as `9e0b274`. The new captures use the same recorded ESPN slate, seeded D1 sample picks, favorite Matthews profile, America/Chicago time zone, and 1000px viewport height. No prediction data is fabricated for this fix.

| View | Before | After |
| --- | --- | --- |
| 390px light | [Before](../aligned-ui/after/dashboard-390-light.png) | [After](dashboard-390-light.png) |
| 390px dark | [Before](../aligned-ui/after/dashboard-390-dark.png) | [After](dashboard-390-dark.png) |
| 1440px light | [Before](../aligned-ui/after/dashboard-1440-light.png) | [After](dashboard-1440-light.png) |
| 1440px dark | [Before](../aligned-ui/after/dashboard-1440-dark.png) | [After](dashboard-1440-dark.png) |

The shorter heading is the only intended visual difference. All four captures have no horizontal page overflow or uncaught page errors. Phone header/content remain aligned at x=12px, desktop at x=24px; game rows remain 56px/48px and all five navigation targets remain 44px high. AI picks, records, upcoming times, favorites and standings remain visible.

The meaningful ordering checks are in `lib/dashboard.test.ts`: changing state/details, equal-start shuffled feeds and immutable input. The existing dashboard browser smoke also reverses the socket feed, starts a game and removes a favorite while asserting the row order remains unchanged and its live clock/AI pick remain visible. Other Scores views keep their existing grouping.
