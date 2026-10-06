// Shoots and measures the score ticker on `/skeleton/live`'s invented slates: thirteen mixed
// games, a quiet two and none, closed and with the slate open, in both themes.
// Usage: node scripts/ticker-shots.mjs <base url> <out dir> [widths, default 390,1440]
// Prints one line of measurements per shot; exits 1 if a page scrolls sideways, a game cannot be
// reached, or a thing to tap is under 44px on a phone.
import { chromium } from "@playwright/test";

const [base, outDir, widthList = "390,1440"] = process.argv.slice(2);
if (base == null || outDir == null) {
  console.error("usage: node scripts/ticker-shots.mjs <base url> <out dir> [widths]");
  process.exit(2);
}
const widths = widthList.split(",").map(Number);
const SLATES = { sample: "", quiet: "?slate=quiet", empty: "?slate=empty" };
const PHONE_BELOW = 768;
const TOUCH = 44;

const browser = await chromium.launch();
let failed = false;

for (const width of widths) {
  for (const scheme of ["light", "dark"]) {
    for (const [slate, query] of Object.entries(SLATES)) {
      const phone = width < PHONE_BELOW;
      const page = await browser.newPage({
        viewport: { width, height: 900 },
        colorScheme: scheme,
        hasTouch: phone,
      });
      await page.goto(`${base}/skeleton/live${query}`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const ticker = page.locator('[data-slot="sample-score-ticker"]');
      const strip = ticker.getByRole("list").first();
      const opener = ticker.getByRole("button");
      const shoot = async (state) => {
        const box = await ticker.boundingBox();
        await page.screenshot({
          path: `${outDir}/ticker-${slate}-${state}-${scheme}-${width}.png`,
          clip: { x: 0, y: box.y, width, height: box.height + 40 },
        });
      };
      const sideways = () =>
        page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );

      const measured = {
        width,
        scheme,
        slate,
        height: (await ticker.boundingBox()).height,
        pageSideways: await sideways(),
      };
      await shoot("closed");

      if (slate !== "empty") {
        const games = await strip.getByRole("link").count();
        // Every entry can be brought wholly into the strip by scrolling it.
        const reached = await strip.evaluate(async (list) => {
          let count = 0;
          for (const entry of list.children) {
            entry.scrollIntoView({ inline: "start", block: "nearest", behavior: "instant" });
            await new Promise((done) => requestAnimationFrame(done));
            const [inner, outer] = [entry.getBoundingClientRect(), list.getBoundingClientRect()];
            if (inner.left >= outer.left - 1 && inner.right <= outer.right + 1) count += 1;
          }
          list.scrollLeft = 0;
          return count;
        });
        const smallest = await ticker.evaluate((root) =>
          Math.min(
            ...Array.from(root.querySelectorAll("a, button"), (target) => {
              const box = target.getBoundingClientRect();
              return Math.min(box.width, box.height);
            }),
          ),
        );
        Object.assign(measured, { games, reached, smallestTarget: smallest });
        if (reached !== games) failed = true;
        if (phone && smallest < TOUCH) failed = true;

        if ((await opener.count()) > 0) {
          measured.count = await opener.locator('[aria-hidden="true"]').first().innerText();
          await opener.click();
          const slateList = ticker.getByRole("list", { name: "All of today's games" });
          const rows = await slateList.getByRole("link").evaluateAll((links) =>
            links.map((link) => {
              const box = link.getBoundingClientRect();
              return { left: box.left, right: box.right, height: box.height };
            }),
          );
          Object.assign(measured, {
            open: {
              rows: rows.length,
              inside: rows.filter((row) => row.left >= 0 && row.right <= width).length,
              rowHeight: Math.min(...rows.map((row) => row.height)),
              height: (await ticker.boundingBox()).height,
              pageSideways: await sideways(),
            },
          });
          if (measured.open.inside !== games || measured.open.pageSideways !== 0) failed = true;
          if (phone && measured.open.rowHeight < TOUCH) failed = true;
          await page.mouse.move(0, 400);
          await shoot("open");
        }
      }
      if (measured.pageSideways !== 0) failed = true;
      console.log(JSON.stringify(measured));
      await page.close();
    }
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
