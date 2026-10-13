import { expect, test } from "./test";

// Fixture mode: no model writes, so the pieces are the three samples `picks.setup.ts` seeds with
// the sample picks (`apps/web/lib/sample-pieces.ts`). What Home shows of them and when, the
// address that is no piece's, and the words around a piece are proved in Vitest
// (`apps/web/lib/home-pieces.test.ts`, `piece-copy.test.ts`).
test("Home has the day's pieces in the page as it is sent, and a piece opens on a page of its own that says a model wrote it", async ({
  page,
}) => {
  const sent = await (await page.request.get("/")).text();
  expect(sent.match(/data-slot="piece"/g)).toHaveLength(3);

  await page.goto("/");
  const pieces = page.getByRole("region", { name: "Notes on the league" });
  await expect(pieces.getByRole("article")).toHaveCount(3);
  const preview = pieces.getByRole("article").first();
  await expect(preview.locator('[data-slot="piece-kicker"]')).toHaveText("Preview · Tue Oct 6");
  await expect(preview.locator('[data-slot="piece-byline"]')).toContainText("Written by a model");

  // The pick Home shows for Nashville at Toronto, which the piece's page is read against below.
  await expect(
    page
      .locator('[data-slot="story"]', { hasText: "Predators at Maple Leafs" })
      .locator('[data-slot="story-pick"]'),
  ).toHaveText("Our pick: Toronto, 58%.");

  await preview.getByRole("link").click();
  await expect(page).toHaveURL("/pieces/2026-10-06-preview");
  await expect(page).toHaveTitle(
    "Nine games tonight, and Buffalo is the firmest pick on the board · Yogan Hockey",
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Nine games tonight, and Buffalo is the firmest pick on the board",
  );
  await expect(page.locator('[data-slot="piece-byline"]')).toContainText("Written by a model");
  await expect(page.locator('[data-slot="piece-body"] p')).toHaveCount(3);
  await expect(page.locator('[data-slot="piece-how"]')).toContainText(
    "A model (@cf/openai/gpt-oss-120b) wrote this",
  );
  // The sample names the pick Home showed for the game. That a model's piece cannot name another
  // is the Writer's check (`agents/writing/check.test.ts`), not this page's.
  await expect(page.locator('[data-slot="piece-body"]')).toContainText(
    "Toronto is the pick over Nashville at 58 percent",
  );

  // A slug nothing was written for is the site's not-found page, answered 404.
  const missing = await page.request.get("/pieces/2026-01-01-preview");
  expect(missing.status()).toBe(404);
  expect(await missing.text()).toContain("Not found · Yogan Hockey");
});
