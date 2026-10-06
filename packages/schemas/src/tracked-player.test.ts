import { expect, test } from "vitest";
import { TrackedPlayerSchema } from "./tracked-player.ts";

const COLUMNS = [
  { name: "games", label: "GP" },
  { name: "goals", label: "G" },
];

test("a Tracked Player needs only an address and a name", () => {
  const player = TrackedPlayerSchema.parse({ slug: "sam", name: "Sam Yogan" });

  expect(player).toEqual({ slug: "sam", name: "Sam Yogan" });
});

test("every part of a Tracked Player is read when it is there", () => {
  const whole = {
    slug: "sam",
    name: "Sam Yogan",
    note: "numbers not audited",
    profile: { jersey: "7", position: "D", positionName: "Defense", hand: "Left" },
    team: { name: "Springfield Owls" },
    currentSeason: { season: "2026-27", columns: COLUMNS, values: ["12", "30"] },
    career: {
      columns: COLUMNS,
      seasons: [{ season: "2025-26", team: "Springfield Owls", values: ["40", "90"] }],
      totals: ["52", "120"],
    },
    gameLog: {
      season: "2026-27",
      columns: COLUMNS,
      games: [
        { date: "2026-10-10", opponent: "Shelbyville Yetis", home: true, played: null },
        {
          date: "2026-10-03",
          opponent: "Capital City Comets",
          home: false,
          played: { result: "W", goalsFor: 9, goalsAgainst: 1, values: ["1", "5"] },
        },
      ],
    },
    projection: { label: "career projection", playerId: "sam-yogan" },
  };

  expect(TrackedPlayerSchema.parse(whole)).toEqual(whole);
});

test("a row of figures must have one figure per column", () => {
  const short = TrackedPlayerSchema.safeParse({
    slug: "sam",
    name: "Sam Yogan",
    currentSeason: { season: "2026-27", columns: COLUMNS, values: ["12"] },
  });
  const careerRow = TrackedPlayerSchema.safeParse({
    slug: "sam",
    name: "Sam Yogan",
    career: {
      columns: COLUMNS,
      seasons: [{ season: "2025-26", team: "Springfield Owls", values: ["40", "90", "1"] }],
      totals: ["40", "90"],
    },
  });
  const game = TrackedPlayerSchema.safeParse({
    slug: "sam",
    name: "Sam Yogan",
    gameLog: {
      season: "2026-27",
      columns: COLUMNS,
      games: [
        {
          date: "2026-10-03",
          opponent: "Capital City Comets",
          home: false,
          played: { result: "W", goalsFor: 9, goalsAgainst: 1, values: [] },
        },
      ],
    },
  });

  expect(short.success).toBe(false);
  expect(careerRow.success).toBe(false);
  expect(game.success).toBe(false);
});

test("a field the shape does not name is refused, so nothing rides along unseen", () => {
  const extra = TrackedPlayerSchema.safeParse({
    slug: "sam",
    name: "Sam Yogan",
    team: { name: "Springfield Owls", level: "anything" },
  });

  expect(extra.success).toBe(false);
});

test("a slug is what a path segment can be", () => {
  expect(TrackedPlayerSchema.safeParse({ slug: "Sam Yogan", name: "Sam Yogan" }).success).toBe(
    false,
  );
});
