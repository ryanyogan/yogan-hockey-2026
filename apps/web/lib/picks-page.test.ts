import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { readPicksPage } from "./picks-page";
import { seedSamplePicks } from "./sample-picks";
import { seedSamplePieces } from "./sample-pieces";

// Fixture mode: the Scoreboard's slate is the recorded one, Tuesday 6 October 2026, whose week
// began on Monday the 5th. The sample picks are `sample-picks.ts`.
beforeAll(async () => {
  vi.stubEnv("ESPN_FIXTURES", "1");
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
  // The first call starts the Scoreboard Agent cold, which takes seconds on a busy machine.
}, 30_000);

describe("the Picks page's read", () => {
  it("has empty figures, no picks and no columns before anything is written", async () => {
    const page = await readPicksPage();

    expect(page.figures).toMatchObject({
      season: { right: 0, wrong: 0 },
      awaiting: 0,
      week: null,
      run: null,
    });
    expect(page.picks).toEqual({});
    expect(page.columns).toBeNull();
  }, 30_000);

  it("has the season's figures, tonight's picks and the three columns once they are", async () => {
    await seedSamplePicks("right");
    await seedSamplePieces();

    const page = await readPicksPage();

    expect(page.figures).toMatchObject({
      season: { right: 3, wrong: 2 },
      // Eight of tonight's nine games have a pick; the ninth's Prediction failed.
      awaiting: 8,
      run: { outcome: "right", length: 2 },
      week: {
        start: "2026-10-05",
        end: "2026-10-11",
        current: true,
        tally: { right: 2, wrong: 1 },
        days: [{ date: "2026-10-05", right: 2, wrong: 1 }],
        best: { picked: { abbreviation: "CAR" }, winProbability: 78 },
        worst: { picked: { abbreviation: "WSH" }, winProbability: 63 },
      },
      sides: { home: { right: 2, wrong: 2 }, road: { right: 1, wrong: 0 } },
    });
    // Nashville at Toronto, and no entry for the game whose Prediction failed.
    expect(page.picks["401892449"]).toEqual({
      status: "made",
      pickTeamId: "21",
      winProbability: 58,
    });
    expect(page.picks).not.toHaveProperty("401892450");
    expect(Object.keys(page.picks)).toHaveLength(8);
    expect(page.columns?.map((column) => column.kind)).toEqual([
      "picks-tonight",
      "picks-miss",
      "picks-run",
    ]);
  }, 30_000);
});
