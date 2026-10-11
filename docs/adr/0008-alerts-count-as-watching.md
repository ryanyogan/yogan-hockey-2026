# A wanted alert counts as someone watching

Amends [ADR 0007](0007-one-worker-no-api-two-agents-three-stores.md), which has the Agents poll ESPN only while a browser is connected.

The site sends push alerts for goals and finals, and an alert has to fire when nobody has the site open. So the Scoreboard Agent may poll with no browser connected, but only while a game that some Account wants alerts for is live. Each day it works out which of the slate's games those are. With none, nothing polls. Otherwise it polls the slate from the first such game's start to the last such game's final. A changed score is a goal, and only then are that one game's plays read, to name the scorer.

Everything else in ADR 0007 stands: one Worker, no API, and a game nobody is watching and nobody wants alerts for is not polled.

## Considered Options

- **Each wanted game's plays, polled continuously**: one ESPN request per game every 10 seconds, where the slate is one request for every game.
- **Every game, every night**: the Parity Reference's polling, which Ryan had already rejected.
- **No alerts in this round**: recommended at first as the smaller scope; Ryan chose the feature.

## Consequences

- An alert follows the event by some 10 to 30 seconds: the slate shows the goal first, and ESPN may publish the scorer a few seconds later.
- On a night when no wanted team or player plays, the site is as quiet as before.
- The React Native app and its Hono API (#110) are cancelled; the installed site is the mobile app, and alerts are web push. On an iPhone that works only once the site is on the Home Screen.
