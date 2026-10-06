---
status: superseded by ADR-0006
---

# Actors are built on ractor, not kameo

The Rust service models each live game and each poller as an actor. We build on ractor, with the third-party `ractor-supervisor` crate restarting the long-lived pollers and game actors as plain linked children that own a `tokio::sync::broadcast` channel. Kameo has OTP-style supervision built in and looked like the closer match, but a side-by-side prototype of the same Game Stream actor showed it retaining every finished game actor in its supervisor (kameo #393) and, without a hand-written retry, losing a restarted poller's registered name so that polling stopped for good (4 of 4 stress runs).

## Consequences

- ractor has no restart policy of its own. If `ractor-supervisor` disappoints, the fallback is a roughly ten-line hand-written restart in the parent's supervision handler.
- An actor's state is lost when it crashes; anything that must survive lives outside the actor.

Detail: [Per-game actor in two crates](https://github.com/ryanyogan/yogan-hockey-2026/issues/10), branch `prototype/game-actor`.
