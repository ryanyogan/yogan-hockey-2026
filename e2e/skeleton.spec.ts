import { expect, test } from "./test";

/** The dev server's own view of the simulated KV namespaces. */
const LOCAL_KV = "/cdn-cgi/local/explorer/api/storage/kv/namespaces";

test("the walking skeleton page exercises all four joins", async ({ page, request }) => {
  await page.goto("/skeleton");
  const bump = page.getByRole("button", { name: "Bump the Agent" });
  const serial = page.getByTestId("reading-serial");
  const count = page.getByTestId("pulse-count");

  // 1. A packages/ui component, styled by the theme: the primary colour is applied.
  const themePrimary = await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.backgroundColor = "var(--primary)";
    document.body.append(probe);
    const colour = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return colour;
  });
  await expect(bump).toHaveCSS("background-color", themePrimary);
  expect(themePrimary).not.toBe("rgba(0, 0, 0, 0)");

  // 2. The reading comes from the cache: a reload shows the same one. A reading left by an
  // earlier run, past its time limit, is answered once more and replaced behind that answer, so
  // the first pair of loads may differ.
  let serialBefore = "";
  await expect(async () => {
    serialBefore = await serial.innerText();
    await page.reload();
    await expect(serial).toHaveText(serialBefore, { timeout: 2_000 });
  }).toPass();

  // 2. The cache is the local KV namespace, and the entry carries its time limit.
  const kv = `${LOCAL_KV}/CACHE-yogan-hockey`;
  const keys = await (await request.get(`${kv}/keys`)).json();
  const entryKey = keys.result
    .map((key: { name: string }) => key.name)
    .find((name: string) => name.includes("skeleton-reading"));
  expect(entryKey).toBeDefined();
  const entry = await (await request.get(`${kv}/values/${encodeURIComponent(entryKey)}`)).json();
  expect(entry).toMatchObject({ metadata: { ttl: 60_000 } });
  expect(JSON.stringify(entry.value)).toContain(serialBefore);

  // 4. First paint is the Agent's state over RPC, and the socket opens.
  await expect(page.getByTestId("socket")).toHaveText("open");
  const countBefore = Number(await page.getByTestId("pulse-initial").innerText());
  await expect(count).toHaveText(String(countBefore));
  const pushes = page.getByTestId("pulse-pushes");
  const pushesBefore = Number(await pushes.innerText());

  await bump.click();

  // 4. The Agent pushes its new state over the socket...
  await expect(count).toHaveText(String(countBefore + 1));
  await expect(pushes).toHaveText(String(pushesBefore + 1));
  // ...and forgot the cached reading, so the loader's next read is a fresh one.
  await expect(serial).not.toHaveText(serialBefore);
  // 3. The row the Agent wrote to D1 is read back by the page's server function.
  await expect(page.getByTestId("bump-rows")).toContainText(`bump ${countBefore + 1} at`);

  // The fresh reading is cached in its turn.
  const serialAfter = await serial.innerText();
  await page.reload();
  await expect(serial).toHaveText(serialAfter);
});

test("the sample dashboard is Home drawn from a slate that is not today's", async ({ page }) => {
  // The Agate prototype's first slate, with its picks and its season's record.
  await page.goto("/skeleton/dashboard?slate=tonight");
  await expect(page).toHaveTitle("Sample dashboard · Yogan Hockey");
  const home = page.locator('[data-slot="home"]');
  await expect(home.getByRole("heading", { name: "Kraken 5, Capitals 3" })).toBeVisible();
  await expect(home.locator('[data-slot="picks-record"]')).toHaveText("29–14");
  // The standings are the recorded ones, read by the page's server function.
  await expect(home.locator('[data-slot="standings"]').getByRole("row")).not.toHaveCount(0);
});

test("the sample live page is the ticker and the day's sections from an invented slate", async ({
  page,
}) => {
  await page.goto("/skeleton/live");
  await expect(page).toHaveTitle("Sample live scores · Yogan Hockey");
  const strip = page.locator('[data-slot="sample-score-ticker"]').getByRole("list").first();
  await expect(strip.getByRole("link")).toHaveCount(13);
  for (const section of ["In progress", "Upcoming", "Final", "Postponed"]) {
    await expect(page.getByRole("region", { name: section })).toBeVisible();
  }

  // A quiet day has two games.
  await page.goto("/skeleton/live?slate=quiet");
  await expect(strip.getByRole("link")).toHaveCount(2);
});
