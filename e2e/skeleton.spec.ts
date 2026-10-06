import { expect, test } from "@playwright/test";

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

  // 2. The reading comes from the cache: a reload shows the same one.
  const serialBefore = await serial.innerText();
  await page.reload();
  await expect(serial).toHaveText(serialBefore);

  // 2. The cache is the local KV namespace, and the entry carries its tag and time limit.
  const kv = `${LOCAL_KV}/VINEXT_KV_CACHE-yogan-hockey`;
  const keys = await (await request.get(`${kv}/keys`)).json();
  const entryKey = keys.result
    .map((key: { name: string }) => key.name)
    .find((name: string) => name.includes("skeleton-reading"));
  expect(entryKey).toBeDefined();
  const entry = await (await request.get(`${kv}/values/${encodeURIComponent(entryKey)}`)).json();
  expect(entry).toMatchObject({ tags: ["skeleton"], cacheControl: { revalidate: 60 } });
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
  // ...and invalidated the cache tag, so the page's next render has a fresh reading.
  await expect(serial).not.toHaveText(serialBefore);
  // 3. The row the Agent wrote to D1 is read back by the server component.
  await expect(page.getByTestId("bump-rows")).toContainText(`bump ${countBefore + 1} at`);

  // The fresh reading is cached in its turn.
  const serialAfter = await serial.innerText();
  await page.reload();
  await expect(serial).toHaveText(serialAfter);
});
