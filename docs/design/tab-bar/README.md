# The phone's tab bar (#139)

Below 768px the five places (Home, Scores, Standings, Teams, Players) are a bar fixed to the foot of the screen, as the approved prototype draws it ([tuned-ledger.md](../tuned-ledger.md)): words only, the current place a solid block like the sidebar's, each cell a fifth of the screen wide and 56px tall, ruled off from its neighbour. The menu and its button are gone; the top bar keeps the wordmark and the theme toggle, which is everything else the menu's bar held. From 768px up nothing changed.

Everything here was taken against a dev server in fixture mode, the prototype beside it.

## Against the prototype

`compare.json`, from `node scripts/look-compare.mjs <prototype> <site>`: the parts #138 measured, and now the top bar, the theme toggle, the tab bar, its first and second cells and its current cell, each for its box and its type, colour, background, rules and padding. Home, Standings and a game, at 390 and 1440px, light and dark: **196 measurements, none differing**.

| At 390 by 844 (prototype and site alike) | |
| --- | --- |
| Tab bar | y 788, 390 by 56px, a 1px rule over it in the shell's rule colour |
| A cell | 78px wide, 56px tall, 12px type at weight 500 in the note colour; 700 on the solid block where current |
| Top bar | 44px; "dark mode" 97 by 44px, ending 8px from the edge |
| Footer | 12px of padding under its last line, then the bar |

Shots at 390px (2x), light and dark, in a viewport as tall as the page so the bar is drawn once at its foot: `home`, `scores`, `standings`, `team`, `players`, `player`, `game`, `not-found`. `manifest.json` is `look-shots.mjs`'s record of all 72 shots of the run (every route, both widths): the bar is 56px on each of the 36 at 390px and absent on each of the 36 at 1440px.

## The desk is unchanged

`desktop-unchanged.json`, from `node scripts/look-same.mjs <before> <after> 1440`: all 36 shots at 1440px (18 routes, light and dark) taken on `main` before the change and on this branch after it, compared pixel by pixel. **34 are identical to the pixel.** The other two are Scores in each theme, which differ only inside a box 56 by 9px at (1360, 65): the "updated" stamp, which is the time the shot was taken. `desktop/` holds Home before and after in both themes. The comparison was made before `main` was merged into the branch; after it the game pages differ from that "before" by what #143 added to them, and by nothing else.

## Standalone, the home bar and a phone on its side

`node scripts/install-check.mjs` ([../install/](../install/README.md)) simulates an iPhone's insets. With a 34px home bar the tab bar is 90px high, its background reaches the bottom edge and its places end above the home bar; the footer's last line ends 12px above the bar; the score strip is 607px above it. On a small phone on its side (667 by 375, 47px at each end, a 21px home bar) the bar is still shown, its places inside the bands at each end. 0 failed checks.

## Every control is 44px

`tap-targets.json`, from `node scripts/tap-targets.mjs <site>`: every link, button and labelled control on every route at 390px, measured by where a tap lands. 18 routes and two further states (the whole slate open, search results), 1,133 controls: **none under 44px either way** but the 225 that are a game timeline's ticks, which are exempt and listed as such.

- **Fixed by this ticket** (each was the size of its words, 16 to 23px tall): the wordmark in the top bar, the footer's ESPN link, links in a sentence (not found, a failed read, "back to NHL", "back to players", "show all" and "show latest", "or browse a team's roster", "Find a player"), a team's and a player's name in a table cell (a game's matchup, a player's career), a player's team in his header, and a team page's "results" and "upcoming" jumps. A dashboard header's link reached 42px, the table under it taking the rest; it is 44 now. All by a reach laid over the link (`tap-target`), so no line moved.
- **Exempt**: a game's timeline ticks, 4 to 6px wide. A hundred plays on a line 358px long cannot each be 44px. The Replay's step buttons and the rows of the plays list pick the same plays at full size (WCAG 2.5.8's "equivalent" exception).
- **Inline links were not exempted.** WCAG lets a link in a sentence stay small; these were given the reach anyway, since it costs nothing to look at.

On each route the same run checks the bar: five places in order, the right one marked (none on a page that is nowhere), no menu or dialog, the sidebar not drawn, the bar at the foot of the screen, the footer's text above it, the score strip above it, no sideways scroll and no table made to scroll by a reach.

## Script and layout shift

- The phone menu was Base UI's Dialog: `mobile-menu` 52.30 kB (17.74 gzipped), loaded on every route. It is gone. `nav-links` grew from 0.85 to 1.24 kB and `nav-item` from 0.32 to 0.61. All client script: 1,086.4 kB to 1,034.3 (335.1 to 317.4 gzipped). The stylesheet grew 0.37 kB.
- The bar is in the server's HTML with its links (see the build notes on `useSearchParams`), fixed, and of a height that does not depend on its content. Loading Home, Standings, a game and Players at 390px, no layout shift named the bar (page totals 0.0006, 0, 0, 0); following a place in it left the bar's box where it was, to the pixel.
