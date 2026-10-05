# ESPN is the only NHL data source

All NHL data, including the Game Stream's play-by-play, comes from ESPN's unauthenticated site API, as in the Parity Reference. The NHL's own API also has play-by-play with rink coordinates in a far smaller payload, but using both would mean mapping game, team and player ids between two sources, and ESPN's game summary already carries play ids, wall-clock timestamps, coordinates and scorer details.

## Consequences

- ESPN's API is unofficial and undocumented; shapes can change without notice, so the service translates them into its own shapes at the edge.
- The summary endpoint is a whole-game snapshot of about 487 KB (about 43 KB gzipped), so a Game Stream polls and diffs by play id.

Detail: [Hockey data source](https://github.com/ryanyogan/yogan-hockey-2026/issues/17), [NHL play-by-play research](https://github.com/ryanyogan/yogan-hockey-2026/issues/3).
