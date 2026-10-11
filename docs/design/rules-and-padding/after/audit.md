# Rules and padding audit

`node scripts/look-audit.mjs` against every route in fixture mode. 72 pages measured, 52 with a finding.

Spacing scale: 0, 4, 8, 12, 16, 24, 32, 48px. Allowed besides:

- padding-top, padding-bottom of `--row-pad` on `*`: `py-row`, a row's own padding: 6px (11px on a phone) around a 20px (22px) line makes the approved prototype's 33px and 45px rows, in a ledger and in whatever is drawn as one of its rows (a play, the line of an empty ledger, the search box).
- margin-right of `em` on `[data-slot="team-mark"], [data-slot="live-marker"], [data-slot="live-marker"] *`: A team's mark and the live dot stand in a line of text, so the space after each is the prototype's part of that text's size (0.45em and 0.6em), as a word space is.
- padding-top, padding-bottom of 1px on `[data-slot="badge"]`: A badge is a 16px line, 1px of padding and its 1px border above and below: the 20px of the line of text it sits in.
- margin-top, margin-bottom, margin-left, margin-right of 1px on `*`: A 1px negative margin laps one rule over the next so that two do not double.

Not audited: `[data-slot="rink"], [data-slot="rink-overlay"], [data-slot^="rink-caption"]` (the rink is #141 to #143's).

| Page | Width | Theme | Overflow px | Rules measured | Rule ends astray | Spacing off the scale | Shift on load | Shift, no favorites |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| home | 390 | light | 0 | 47 | 4 | 1 | 0.0040 | 0.0006 |
| home | 390 | dark | 0 | 47 | 4 | 1 | 0.0040 | 0.0006 |
| home | 1440 | light | 0 | 44 | 0 | 0 | 0.0109 | 0.0061 |
| home | 1440 | dark | 0 | 44 | 0 | 0 | 0.0112 | 0.0234 |
| scores | 390 | light | 0 | 27 | 4 | 1 | 0.0158 | 0.0000 |
| scores | 390 | dark | 0 | 27 | 4 | 1 | 0.0158 | 0.0000 |
| scores | 1440 | light | 0 | 24 | 0 | 0 | 0.0146 | 0.0017 |
| scores | 1440 | dark | 0 | 24 | 0 | 0 | 0.0146 | 0.0017 |
| standings | 390 | light | 0 | 65 | 4 | 1 | 0.0000 | 0.0000 |
| standings | 390 | dark | 0 | 65 | 4 | 1 | 0.0000 | 0.0000 |
| standings | 1440 | light | 0 | 50 | 0 | 0 | 0.0000 | 0.0000 |
| standings | 1440 | dark | 0 | 50 | 0 | 0 | 0.0000 | 0.0000 |
| teams | 390 | light | 0 | 55 | 4 | 1 | 0.0000 | 0.0000 |
| teams | 390 | dark | 0 | 55 | 4 | 1 | 0.0000 | 0.0000 |
| teams | 1440 | light | 0 | 47 | 0 | 0 | 0.0000 | 0.0000 |
| teams | 1440 | dark | 0 | 47 | 0 | 0 | 0.0000 | 0.0000 |
| team | 390 | light | 0 | 113 | 4 | 1 | 0.0047 | 0.0047 |
| team | 390 | dark | 0 | 113 | 4 | 1 | 0.0047 | 0.0047 |
| team | 1440 | light | 0 | 104 | 0 | 0 | 0.0015 | 0.0015 |
| team | 1440 | dark | 0 | 104 | 0 | 0 | 0.0015 | 0.0015 |
| roster | 390 | light | 0 | 52 | 4 | 1 | 0.0000 | 0.0000 |
| roster | 390 | dark | 0 | 52 | 4 | 1 | 0.0000 | 0.0000 |
| roster | 1440 | light | 0 | 43 | 0 | 0 | 0.0005 | 0.0005 |
| roster | 1440 | dark | 0 | 43 | 0 | 0 | 0.0005 | 0.0005 |
| stats | 390 | light | 0 | 29 | 4 | 1 | 0.0000 | 0.0000 |
| stats | 390 | dark | 0 | 29 | 4 | 1 | 0.0000 | 0.0000 |
| stats | 1440 | light | 0 | 20 | 0 | 0 | 0.0005 | 0.0005 |
| stats | 1440 | dark | 0 | 20 | 0 | 0 | 0.0005 | 0.0005 |
| players | 390 | light | 0 | 23 | 4 | 1 | 0.0000 | 0.0000 |
| players | 390 | dark | 0 | 23 | 4 | 1 | 0.0000 | 0.0000 |
| players | 1440 | light | 0 | 20 | 0 | 0 | 0.0000 | 0.0000 |
| players | 1440 | dark | 0 | 20 | 0 | 0 | 0.0000 | 0.0000 |
| player | 390 | light | 0 | 41 | 4 | 1 | 0.0000 | 0.0000 |
| player | 390 | dark | 0 | 41 | 4 | 1 | 0.0000 | 0.0000 |
| player | 1440 | light | 0 | 38 | 0 | 0 | 0.0000 | 0.0000 |
| player | 1440 | dark | 0 | 38 | 0 | 0 | 0.0000 | 0.0000 |
| player-games | 390 | light | 0 | 41 | 4 | 1 | 0.0000 | 0.0000 |
| player-games | 390 | dark | 0 | 41 | 4 | 1 | 0.0000 | 0.0000 |
| player-games | 1440 | light | 0 | 38 | 0 | 0 | 0.0000 | 0.0000 |
| player-games | 1440 | dark | 0 | 38 | 0 | 0 | 0.0000 | 0.0000 |
| game | 390 | light | 0 | 120 | 0 | 1 | 0.0000 | 0.0000 |
| game | 390 | dark | 0 | 120 | 0 | 1 | 0.0000 | 0.0000 |
| game | 1440 | light | 0 | 107 | 0 | 0 | 0.0000 | 0.0000 |
| game | 1440 | dark | 0 | 107 | 0 | 0 | 0.0000 | 0.0000 |
| game-scoring | 390 | light | 0 | 58 | 4 | 1 | 0.0000 | 0.0000 |
| game-scoring | 390 | dark | 0 | 58 | 4 | 1 | 0.0000 | 0.0000 |
| game-scoring | 1440 | light | 0 | 45 | 0 | 0 | 0.0000 | 0.0000 |
| game-scoring | 1440 | dark | 0 | 45 | 0 | 0 | 0.0000 | 0.0000 |
| game-pick | 390 | light | 0 | 45 | 4 | 1 | 0.0000 | 0.0000 |
| game-pick | 390 | dark | 0 | 45 | 4 | 1 | 0.0000 | 0.0000 |
| game-pick | 1440 | light | 0 | 32 | 0 | 0 | 0.0000 | 0.0000 |
| game-pick | 1440 | dark | 0 | 32 | 0 | 0 | 0.0000 | 0.0000 |
| game-scheduled | 390 | light | 0 | 47 | 4 | 1 | 0.0018 | 0.0018 |
| game-scheduled | 390 | dark | 0 | 47 | 4 | 1 | 0.0018 | 0.0018 |
| game-scheduled | 1440 | light | 0 | 44 | 0 | 0 | 0.0000 | 0.0000 |
| game-scheduled | 1440 | dark | 0 | 44 | 0 | 0 | 0.0000 | 0.0000 |
| not-found | 390 | light | 0 | 18 | 4 | 1 | 0.0031 | 0.0000 |
| not-found | 390 | dark | 0 | 18 | 4 | 1 | 0.0031 | 0.0000 |
| not-found | 1440 | light | 0 | 15 | 0 | 0 | 0.0046 | 0.0016 |
| not-found | 1440 | dark | 0 | 15 | 0 | 0 | 0.0046 | 0.0016 |
| error | 390 | light | 0 | 18 | 4 | 1 | 0.0335 | 0.0335 |
| error | 390 | dark | 0 | 18 | 4 | 1 | 0.0336 | 0.0336 |
| error | 1440 | light | 0 | 15 | 0 | 0 | 0.0000 | 0.0000 |
| error | 1440 | dark | 0 | 15 | 0 | 0 | 0.0000 | 0.0000 |
| sample-live | 390 | light | 0 | 42 | 4 | 1 | 0.0336 | 0.0000 |
| sample-live | 390 | dark | 0 | 42 | 4 | 1 | 0.0367 | 0.0000 |
| sample-live | 1440 | light | 0 | 41 | 0 | 0 | 0.0302 | 0.0016 |
| sample-live | 1440 | dark | 0 | 41 | 0 | 0 | 0.0342 | 0.0017 |
| sample-loading | 390 | light | 0 | 68 | 4 | 1 | 0.0031 | 0.0000 |
| sample-loading | 390 | dark | 0 | 68 | 4 | 1 | 0.0031 | 0.0000 |
| sample-loading | 1440 | light | 0 | 65 | 0 | 0 | 0.0046 | 0.0016 |
| sample-loading | 1440 | dark | 0 | 65 | 0 | 0 | 0.0046 | 0.0016 |

## Rule ends astray

- `tab-bar | <a> flex h-14 items-center justify-center border-rule border-l text-small : bottom end overshoots the rule of ledger > ledger-body > ledger-row | <tr> relative border-b hover:bg-highlight by 9.5px` (8; home@390)
- `tab-bar | <a> flex h-14 items-center justify-center border-rule border-l text-small : bottom end ends at nothing` (72; scores@390, stats@390, players@390, player-games@390, game-pick@390, game-scheduled@390, ...)
- `tab-bar | <a> flex h-14 items-center justify-center border-rule border-l text-small : bottom end stops short of the rule of ledger > ledger-body > ledger-row | <tr> relative border-b hover:bg-highlight by 15.5px` (8; standings@390)
- `tab-bar | <a> flex h-14 items-center justify-center border-rule border-l text-small : bottom end stops short of the rule of ledger > ledger-body > ledger-row | <tr> relative border-b hover:bg-highlight by 18.5px` (8; teams@390)
- `tab-bar | <a> flex h-14 items-center justify-center border-rule border-l text-small : bottom end overshoots the rule of ledger > ledger-body > ledger-row | <tr> relative border-b hover:bg-highlight by 20.5px` (8; team@390)
- `tab-bar | <a> flex h-14 items-center justify-center border-rule border-l text-small : bottom end overshoots the rule of ledger > ledger-body > ledger-row | <tr> relative border-b hover:bg-highlight by 20.41px` (8; roster@390)
- `tab-bar | <a> flex h-14 items-center justify-center border-rule border-l text-small : bottom end stops short of the rule of ledger > ledger-head > ledger-column | <th> whitespace-nowrap border-rule-head border-b px-2 py-1 font-label text- by 3.5px` (8; player@390)
- `tab-bar | <a> flex h-14 items-center justify-center border-rule border-l text-small : bottom end stops short of the rule of game-tab > scoring-summary > play-row | <button> flex w-full cursor-pointer gap-2 border-border border-b px-2 py-row te by 21.17px` (8; game-scoring@390)
- `tab-bar | <a> flex h-14 items-center justify-center border-rule border-l text-small : bottom end stops short of the rule of ledger > ledger-body > ledger-row | <tr> relative border-b hover:bg-highlight by 17.5px` (8; sample-live@390)

## Spacing off the scale

- `(shell) | <div> flex min-w-0 flex-1 flex-col border-rule max-md:pb-(--tab-bar) md:bord: padding-bottom 56px` (36; home@390, scores@390, standings@390, teams@390, team@390, roster@390, ...)

## Rules drawn by a pseudo-element (not measured: check by eye)

None.
