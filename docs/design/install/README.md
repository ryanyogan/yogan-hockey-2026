# Installing the site to a home screen (#130)

> **The shell shown here is superseded by [agate.md](../agate.md) on 2026-10-11.** The Agate look replaced the top bar, tab bar, sidebar and colours in #168 to #174, so those results and the screenshots are kept as history; the manifest and icons are still what ships, and `scripts/install-check.mjs` still checks them.

What was checked by machine, what it showed, and what only a real phone can confirm. The
numbers are in `report.json` beside this file; `node scripts/install-check.mjs <baseURL> <outDir>`
writes it and the seven shots again (see the build notes for the `TMPDIR` it needs).

## What a phone is given

- **Manifest** at `/manifest.webmanifest` (`apps/web/app/manifest.ts`, from `lib/install.ts`):
  name "Yogan Hockey", short name "Hockey", `display: standalone`, `start_url`, `scope` and `id`
  all `/`, paper (`#fbfaf7`) for `background_color` and `theme_color`, and four PNG icons: 192
  and 512, each plain and maskable.
- **Bars' colour**: two `theme-color` tags. Until the page hydrates each of the operating
  system's preferences gets its own theme's page colour; from then on both carry the colour of
  the theme shown, so a visitor who chose the other theme gets bars that match the page.
- **iOS**: `apple-touch-icon` (180px), `apple-mobile-web-app-title` "Hockey", status bar style
  `default`, `mobile-web-app-capable` and Apple's older name for it, and 24 splash images: 12
  iPhone screens, portrait, in paper and in slate, chosen by `prefers-color-scheme`.
- **Shell**: `viewport-fit=cover`, and `env(safe-area-inset-*)` added to the padding of the top
  bar, the phone's tab bar, the sidebar, the ticker strip, the page and the footer.
- **Favicon**: `/favicon.ico` and a 64px PNG. The site had none; every visit used to ask the
  Worker for `/favicon.ico` and get the not-found page.

The icon is the wordmark's initials, "Y/H" in Geist Mono Bold between two ledger rules, ink on
paper. `pnpm app-icons` draws all of it (`scripts/app-icons.ts`).

## Results

Run on 2026-10-11 against a production build in fixture mode under `vite preview` (the
Worker's own entry, with the page cache on), Chromium 153.0.8010.12.

| Check | Result |
| --- | --- |
| Chrome's installability errors for `/` (`Page.getInstallabilityErrors`) | none |
| The same question put to a page with no manifest (the control) | refused: `no-manifest` |
| Chrome's manifest parse errors (`Page.getAppManifest`) | none |
| `/manifest.webmanifest` | 200, `application/manifest+json`, 812 bytes, no `x-page-cache`, no redirect, also with a stray `?tab=scoring` |
| The 4 manifest icons, the touch icon, both favicons, the 24 splash images | each 200 and `image/*`, served by the platform's static assets before the Worker runs |
| Top bar with a 47px status bar | its background starts at 0 and is 91px high (44 + 47); the wordmark and both buttons start at 58.8px or lower |
| Tab bar with a 34px home bar (#139) | its background runs to the bottom edge and is 90px high (56 + 34); its five places end 53px above the edge; it starts 607px below the score strip |
| Footer with a 34px home bar | its last line ends 12px above the tab bar, 102px above the bottom edge |
| Sideways scroll at 390px | none |
| Bars' colour with the visitor's theme opposite to the operating system's | both tags carry the shown theme's colour, in light and in dark |
| A small phone on its side (667 by 375, 47px at each end, 21px home bar): still the tab bar | the bar is 77px high (56 + 21) and runs edge to edge; its places start at 90px and end at 588px, inside the 47px bands, and 40px above the bottom edge; the score strip ends 198px above it and the footer's last line 12px above it |
| Phone on its side (844 by 390, 47px at each end, 21px home bar): the sidebar layout | the sidebar's links start at 63px, its theme switch ends 39px above the bottom edge, and the ticker, page and footer end at 797px, the edge of the 47px band |

Shots (390 by 844, the hatched bands are where the simulated status bar, home bar and notch are):
`standalone-light-390-top.png` and `-bottom.png`, the same two for dark, `sideways-light-844.png`,
and `sideways-light-667-top.png` and `-bottom.png` (no bands drawn on those two).

## What the machine checks are, and are not

- **"Lighthouse installability" is Chrome's own answer, asked directly.** Lighthouse 12 removed
  its PWA category and the `installable-manifest` audit, which was a wrapper around
  `Page.getInstallabilityErrors`. Lighthouse 11.7.1, the last with the audit, was tried through
  `pnpm dlx` against Playwright's Chromium 153 and could not drive it (`PROTOCOL_TIMEOUT` on
  `Debugger.disable`), so no Lighthouse report exists. The script asks Chrome the same question.
- **The question needs the full Chromium and a profile.** Playwright's default headless shell
  answers "no errors" for any page, including one with no manifest, and an incognito context is
  refused as `in-incognito`. The script therefore uses `channel: "chromium"` with a persistent
  profile and asks about a page with no manifest first.
- **This is desktop Chromium's verdict.** It says the manifest and icons meet Chrome's rules. It
  does not show Android's install prompt, and says nothing about Safari.
- **The insets are simulated** with `Emulation.setSafeAreaInsetsOverride`. `display-mode:
  standalone` was not emulated: Chromium ignored it as a media feature, and nothing in the site
  reads it. The 47px top inset is the worst case; with status bar style `default` iOS keeps the
  page below the status bar and reports a top inset of 0.
- **Only the sidebar takes the top inset at 768px and wider.** The ticker and the page beside it
  do not: a phone on its side and an iPad with status bar style `default` both report 0 there.
- **No splash was seen.** The images exist at each screen's exact size and the tags name them;
  whether iOS shows them is for a phone to say.

## Limits that are the platforms', not bugs

- **Android's splash is always paper.** A manifest holds one `background_color`.
- **iOS's splash follows the operating system**, not the site's own toggle: it is chosen before
  any of the site runs.
- **iOS draws its own status bar** with style `default`: light or dark with the operating
  system. A visitor on a light phone who chose the slate theme may see a light status bar over a
  dark page. `black-translucent` would lay the page under white status text, which cannot be
  read on paper.
- **Bars between first paint and hydration** follow the operating system, so for a visitor whose
  choice differs they change colour once, as the page hydrates.

## For Ryan, on real phones

Android, Chrome:

- [ ] The menu offers "Install app" (or "Add to Home screen") on `hockey.yogan.dev`.
- [ ] The home screen icon is "Y/H" on paper, whole inside the launcher's shape, named "Hockey".
- [ ] It opens with no address bar; the splash is paper with the icon and "Yogan Hockey".
- [ ] The status bar is paper in the light theme and slate after "dark mode" is pressed.

iPhone, Safari (Share, then Add to Home Screen):

- [ ] The sheet proposes the name "Hockey" and shows the "Y/H" icon.
- [ ] It opens with no Safari bars, and a splash of the mark on paper (light) or slate (dark).
- [ ] Nothing sits under the notch or island: the wordmark and "dark mode" are both reachable.
- [ ] The tab bar's five places sit above the home bar, and its colour runs under the home bar
      to the bottom edge.
- [ ] Scrolled to the end, the footer's last line is above the tab bar.
- [ ] Turned sideways, nothing is under the notch.
- [ ] The status bar is readable in both themes (see the limit above if the theme and the
      phone's own setting differ).
