// Puts a local fixture build in the state the measurement expects, through the site itself:
// the sample picks seeded (as Playwright's setup does), and the recorded finished game opened
// until its plays are in D1 and the page cache keeps its page.
//
//   node scripts/performance/prepare-fixtures.ts <base> <finished-game-id>
import { chromium } from "@playwright/test";

const [base, finishedGame] = process.argv.slice(2);
if (!base || !finishedGame) {
  console.error("usage: prepare-fixtures.ts <base> <finished-game-id>");
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${base}/skeleton/picks`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Seed picks, the final's right" }).click();
await page.locator('[data-slot="picks-seeded"]', { hasText: "pick is right" }).waitFor();
await browser.close();

for (let asked = 1; asked <= 20; asked++) {
  const answer = await fetch(`${base}/nhl/games/${finishedGame}`);
  await answer.arrayBuffer();
  const kept = answer.headers.get("x-page-cache");
  if (answer.ok && (kept === "hit" || kept === "stale")) {
    console.error(`picks seeded; game ${finishedGame} is archived and its page kept (${kept})`);
    process.exit(0);
  }
  await new Promise((done) => setTimeout(done, 1500));
}
console.error(`game ${finishedGame} was never kept by the page cache: is the local D1 migrated?`);
process.exit(1);
