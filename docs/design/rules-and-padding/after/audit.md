# Rules and padding audit

`node scripts/look-audit.mjs` against every route in fixture mode. 72 pages measured, 43 with a finding.

Spacing scale: 0, 4, 8, 12, 16, 24, 32, 48px. Allowed besides:

- padding-top, padding-bottom of `--row-pad` on `*`: `py-row`, a row's own padding: 6px (11px on a phone) around a 20px (22px) line makes the approved prototype's 33px and 45px rows, in a ledger and in whatever is drawn as one of its rows (a play, the line of an empty ledger, the search box).
- margin-right of `em` on `[data-slot="team-mark"], [data-slot="live-marker"], [data-slot="live-marker"] *`: A team's mark and the live dot stand in a line of text, so the space after each is the prototype's part of that text's size (0.45em and 0.6em), as a word space is.
- padding-top, padding-bottom of 1px on `[data-slot="badge"]`: A badge is a 16px line, 1px of padding and its 1px border above and below: the 20px of the line of text it sits in.
- margin-top, margin-bottom, margin-left, margin-right of 1px on `*`: A 1px negative margin laps one rule over the next so that two do not double.

Not audited: `[data-slot="rink"], [data-slot="rink-overlay"], [data-slot^="rink-caption"]` (the rink is #141 to #143's).

| Page | Width | Theme | Overflow px | Rules measured | Rule ends astray | Spacing off the scale | Shift on load | Shift, no favorites |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| home | 390 | light | 0 | 42 | 0 | 0 | 0.0043 | 0.0006 |
| home | 390 | dark | 0 | 42 | 0 | 0 | 0.0043 | 0.0006 |
| home | 1440 | light | 0 | 44 | 0 | 0 | 0.0109 | 0.0061 |
| home | 1440 | dark | 0 | 44 | 0 | 0 | 0.0112 | 0.0234 |
| scores | 390 | light | 0 | 22 | 0 | 0 | 0.0161 | 0.0003 |
| scores | 390 | dark | 0 | 22 | 0 | 0 | 0.0161 | 0.0000 |
| scores | 1440 | light | 0 | 24 | 0 | 0 | 0.0146 | 0.0017 |
| scores | 1440 | dark | 0 | 24 | 0 | 0 | 0.0146 | 0.0017 |
| standings | 390 | light | 0 | 60 | 0 | 0 | 0.0013 | 0.0000 |
| standings | 390 | dark | 0 | 60 | 0 | 0 | 0.0000 | 0.0000 |
| standings | 1440 | light | 0 | 50 | 0 | 0 | 0.0000 | 0.0000 |
| standings | 1440 | dark | 0 | 50 | 0 | 0 | 0.0000 | 0.0000 |
| teams | 390 | light | 0 | 50 | 0 | 0 | 0.0000 | 0.0013 |
| teams | 390 | dark | 0 | 50 | 0 | 0 | 0.0014 | 0.0014 |
| teams | 1440 | light | 0 | 47 | 0 | 0 | 0.0000 | 0.0000 |
| teams | 1440 | dark | 0 | 47 | 0 | 0 | 0.0000 | 0.0000 |
| team | 390 | light | 0 | 108 | 0 | 0 | 0.0047 | 0.0047 |
| team | 390 | dark | 0 | 108 | 0 | 0 | 0.0047 | 0.0047 |
| team | 1440 | light | 0 | 104 | 0 | 0 | 0.0015 | 0.0015 |
| team | 1440 | dark | 0 | 104 | 0 | 0 | 0.0015 | 0.0015 |
| roster | 390 | light | 0 | 47 | 0 | 0 | 0.0000 | 0.0000 |
| roster | 390 | dark | 0 | 47 | 0 | 0 | 0.0000 | 0.0000 |
| roster | 1440 | light | 0 | 43 | 0 | 0 | 0.0005 | 0.0005 |
| roster | 1440 | dark | 0 | 43 | 0 | 0 | 0.0005 | 0.0005 |
| stats | 390 | light | 0 | 24 | 0 | 0 | 0.0013 | 0.0000 |
| stats | 390 | dark | 0 | 24 | 0 | 0 | 0.0000 | 0.0000 |
| stats | 1440 | light | 0 | 20 | 0 | 0 | 0.0005 | 0.0005 |
| stats | 1440 | dark | 0 | 20 | 0 | 0 | 0.0005 | 0.0005 |
| players | 390 | light | 0 | 18 | 0 | 0 | 0.0000 | 0.0000 |
| players | 390 | dark | 0 | 18 | 0 | 0 | 0.0000 | 0.0000 |
| players | 1440 | light | 0 | 20 | 0 | 0 | 0.0000 | 0.0000 |
| players | 1440 | dark | 0 | 20 | 0 | 0 | 0.0000 | 0.0000 |
| player | 390 | light | 0 | 36 | 0 | 0 | 0.0000 | 0.0000 |
| player | 390 | dark | 0 | 36 | 0 | 0 | 0.0000 | 0.0000 |
| player | 1440 | light | 0 | 38 | 0 | 0 | 0.0000 | 0.0000 |
| player | 1440 | dark | 0 | 38 | 0 | 0 | 0.0000 | 0.0000 |
| player-games | 390 | light | 0 | 36 | 0 | 0 | 0.0013 | 0.0000 |
| player-games | 390 | dark | 0 | 36 | 0 | 0 | 0.0014 | 0.0000 |
| player-games | 1440 | light | 0 | 38 | 0 | 0 | 0.0000 | 0.0000 |
| player-games | 1440 | dark | 0 | 38 | 0 | 0 | 0.0000 | 0.0000 |
| game | 390 | light | 0 | 110 | 0 | 0 | 0.0581 | 0.0581 |
| game | 390 | dark | 0 | 110 | 0 | 0 | 0.0581 | 0.0581 |
| game | 1440 | light | 0 | 101 | 0 | 0 | 0.0000 | 0.0000 |
| game | 1440 | dark | 0 | 101 | 0 | 0 | 0.0000 | 0.0000 |
| game-scoring | 390 | light | 0 | 48 | 0 | 0 | 0.0000 | 0.0000 |
| game-scoring | 390 | dark | 0 | 48 | 0 | 0 | 0.0581 | 0.0000 |
| game-scoring | 1440 | light | 0 | 39 | 0 | 0 | 0.0000 | 0.0000 |
| game-scoring | 1440 | dark | 0 | 39 | 0 | 0 | 0.0000 | 0.0000 |
| game-pick | 390 | light | 0 | 35 | 0 | 0 | 0.0000 | 0.0116 |
| game-pick | 390 | dark | 0 | 35 | 0 | 0 | 0.0000 | 0.0116 |
| game-pick | 1440 | light | 0 | 26 | 0 | 0 | 0.0000 | 0.0000 |
| game-pick | 1440 | dark | 0 | 26 | 0 | 0 | 0.0000 | 0.0000 |
| game-scheduled | 390 | light | 0 | 42 | 0 | 0 | 0.0598 | 0.0598 |
| game-scheduled | 390 | dark | 0 | 42 | 0 | 0 | 0.0598 | 0.0018 |
| game-scheduled | 1440 | light | 0 | 44 | 0 | 0 | 0.0001 | 0.0001 |
| game-scheduled | 1440 | dark | 0 | 44 | 0 | 0 | 0.0001 | 0.0001 |
| not-found | 390 | light | 0 | 13 | 0 | 0 | 0.0031 | 0.0000 |
| not-found | 390 | dark | 0 | 13 | 0 | 0 | 0.0031 | 0.0000 |
| not-found | 1440 | light | 0 | 15 | 0 | 0 | 0.0046 | 0.0016 |
| not-found | 1440 | dark | 0 | 15 | 0 | 0 | 0.0046 | 0.0016 |
| error | 390 | light | 0 | 13 | 0 | 0 | 0.0278 | 0.0291 |
| error | 390 | dark | 0 | 13 | 0 | 0 | 0.0278 | 0.0278 |
| error | 1440 | light | 0 | 15 | 0 | 0 | 0.0000 | 0.0000 |
| error | 1440 | dark | 0 | 15 | 0 | 0 | 0.0000 | 0.0000 |
| sample-live | 390 | light | 0 | 37 | 0 | 0 | 0.0336 | 0.0000 |
| sample-live | 390 | dark | 0 | 37 | 0 | 0 | 0.0367 | 0.0000 |
| sample-live | 1440 | light | 0 | 41 | 0 | 0 | 0.0302 | 0.0016 |
| sample-live | 1440 | dark | 0 | 41 | 0 | 0 | 0.0342 | 0.0017 |
| sample-loading | 390 | light | 0 | 63 | 0 | 0 | 0.0031 | 0.0000 |
| sample-loading | 390 | dark | 0 | 63 | 0 | 0 | 0.0031 | 0.0000 |
| sample-loading | 1440 | light | 0 | 65 | 0 | 0 | 0.0046 | 0.0016 |
| sample-loading | 1440 | dark | 0 | 65 | 0 | 0 | 0.0046 | 0.0016 |

## Rule ends astray

None.

## Spacing off the scale

None.

## Rules drawn by a pseudo-element (not measured: check by eye)

None.
