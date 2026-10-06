import { expect, type Page, test } from "@playwright/test";

const tabs = (page: Page) => page.getByRole("navigation", { name: "NHL", exact: true });
const views = (page: Page) => page.getByRole("navigation", { name: "Standings view" });
const rows = (page: Page) => page.getByRole("table").getByRole("row");

// The recorded standings (fixture mode): the table titles each view draws, in order.
const VIEWS = [
  {
    // The default view has the bare address.
    url: "/nhl",
    view: "division",
    tables: ["Atlantic Division", "Metropolitan Division", "Central Division", "Pacific Division"],
  },
  {
    url: "/nhl?view=conference",
    view: "conference",
    tables: ["Eastern Conference", "Western Conference"],
  },
  {
    url: "/nhl?view=wildcard",
    view: "wild card",
    tables: [
      "Atlantic Division",
      "Metropolitan Division",
      "Wild Card",
      "Central Division",
      "Pacific Division",
      "Wild Card",
    ],
    also: async (page: Page) => {
      // The playoff line, under each conference's second wild card.
      await expect(page.locator("tr[data-cutoff]")).toHaveCount(2);
    },
  },
  {
    url: "/nhl?view=league",
    view: "league",
    tables: ["National Hockey League"],
    also: async (page: Page) => {
      // All 32 teams under one header, ranked, each row linking to its team.
      await expect(rows(page)).toHaveCount(33);
      const leader = rows(page).nth(1);
      await expect(leader.getByRole("cell")).toHaveText([
        "1",
        // Both names are in the markup; the phone's abbreviation is hidden at this width.
        /New York Rangers$/,
        "4",
        "3",
        "1",
        "0",
        "+5",
        "6",
      ]);
      await expect(leader.getByRole("link")).toHaveAttribute("href", "/nhl/teams/13");
      // Every row has its team's mark: a file of the site's own, drawn, 14px square.
      await expect(page.locator("main [data-slot=team-mark]")).toHaveCount(32);
      const mark = leader.locator("[data-slot=team-mark] img");
      await expect(mark).toHaveAttribute("src", /^\/team-marks\/13-28\.[0-9a-f]{8}\.webp$/);
      await expect(mark).toHaveJSProperty("complete", true);
      expect(await mark.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(28);
      expect(await mark.boundingBox()).toMatchObject({ width: 14, height: 14 });
    },
  },
];

test("/nhl shows each standings view and the teams from a pasted URL", async ({ browser }) => {
  // Each address is opened in a browser of its own, as a pasted link is, which also keeps to one
  // hard navigation per page (see the build notes).
  const paste = async (url: string, check: (page: Page) => Promise<void>) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    // No image is ESPN's: the marks are the site's own files.
    const abroad: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).hostname !== "localhost") abroad.push(request.url());
    });
    await page.goto(url);
    await check(page);
    expect(abroad).toEqual([]);
    await context.close();
  };

  for (const { url, view, tables, also } of VIEWS) {
    await paste(url, async (page) => {
      await expect(page).toHaveTitle("NHL standings · Yogan Hockey");
      await expect(tabs(page).locator('[aria-current="page"]')).toHaveText("standings");
      await expect(views(page).locator('[aria-current="page"]')).toHaveText(view);
      await expect(page.locator("main section h2")).toHaveText(
        tables.map((title) => new RegExp(`^${title}`)),
      );
      await also?.(page);
    });
  }

  await paste("/nhl?tab=teams", async (page) => {
    await expect(page).toHaveTitle("NHL teams · Yogan Hockey");
    await expect(tabs(page).locator('[aria-current="page"]')).toHaveText("teams");
    await expect(views(page)).toHaveCount(0);
    await expect(rows(page)).toHaveCount(33);
    await expect(page.getByRole("link", { name: "Toronto Maple Leafs" })).toHaveAttribute(
      "href",
      "/nhl/teams/21",
    );
  });
});
