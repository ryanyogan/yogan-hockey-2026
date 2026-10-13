# Agate prototype

Throwaway. This is Home, and the Picks page (#218) at `?page=picks`, in the Agate look Ryan approved on Oct 11 2026, and the pixel target for the production port. The spec is [docs/design/agate.md](../../docs/design/agate.md).

Since #240 the prototype is no longer the target for everything. Home, the masthead, the footer and the colour tokens are specified by [docs/design/front-page/](../../docs/design/front-page/) and measured by `node scripts/front-page-check.mjs`. The prototype is still the visual target for the other routes, and `copy.js` is still the source of the sentences. Its night colours are the new ones, so those routes are compared in the right colours.

## Run it

```sh
pnpm prototype:agate        # add to package.json: "prototype:agate": "node prototypes/agate/serve.mjs"
```

It runs on port 5129 (or `PORT=<n>`). It's Node's own HTTP server, so there's no install or build. The fonts come from Google Fonts.

## Using it

- The purple pill switches between two sample slates. **Oct 11** shows three finals, as the site showed that night. **Busy** is the nine-game slate from `prototypes/tuned-ledger`, with live, overtime, scheduled and no-pick games, plus leads and briefs.
- **Day** and **Night** switch the theme, as next-themes does: a `.dark` class on `<html>` and `localStorage.theme`.
- On a phone, the Eastern/Western buttons switch the standings.
- Everything is in the address: `?slate=tonight|busy&theme=light|dark&chrome=0`. `chrome=0` hides the switcher. `at=Standings` marks another section as the current one. The sections are always six (an old `picks=1` does nothing), and Home and Picks in them lead to the two pages. `news=0` leaves ESPN's headlines out, as Home is when they cannot be read (#217). `pieces=0` leaves the written pieces out, as Home is when none has been published, and `pieces=1` or `2` draws only so many.
- The Picks page: `?page=picks`. `figures=0` draws it before any pick is decided. `season=mid` swaps in a mid-season's big figures ("12–9", "11", "129–114"), to see that they fit a phone. `columns=0` leaves the columns out, as the page is when none has been published. `slate=busy` gives it the nine-game slate the site's fixture mode has.
- Screenshots: `PREVIEW_URL=http://localhost:5129 node prototypes/agate/capture.mjs` writes to `docs/design/agate/`.

## Files

| File | What it is |
|---|---|
| `style.css` | The look. Its tokens use theme.css role names. |
| `copy.js` | Every sentence as pure functions: headline, deck, kicker, pick, leads/briefs, agate names, and the Picks page's labels and sentences. **Port these with tests.** |
| `data.js` | The sample slates, standings, ESPN's headlines as recorded on Oct 12 2026, the three sample pieces, the Picks page's figures and its three sample columns, and the location/nickname table the copy needs. |
| `app.js`, `index.html` | Drawing with template strings. |
| `serve.mjs`, `capture.mjs` | The server and the screenshots. |
