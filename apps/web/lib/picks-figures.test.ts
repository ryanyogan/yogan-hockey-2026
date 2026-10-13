import type { SeasonPick } from "@yogan-hockey/schemas";
import { describe, expect, it } from "vitest";
import { BANDS, picksFigures, weekOf } from "./picks-figures";

const TOR = { id: "21", abbreviation: "TOR", name: "Toronto Maple Leafs" };
const NSH = { id: "27", abbreviation: "NSH", name: "Nashville Predators" };

let next = 0;

/**
 * A pick of Nashville at Toronto on `date`, an evening game, at `chance`: of the home team or
 * the road team, which then won or lost by `margin`.
 */
function pick(
  date: string,
  side: "home" | "road",
  result: "won" | "lost",
  chance = 58,
  margin = 1,
): SeasonPick {
  const homeWon = (side === "home") === (result === "won");
  // An evening start in Eastern time is after midnight UTC: the day after the slate's.
  const start = new Date(`${date}T23:00:00Z`);
  return {
    gameId: `game-${next++}`,
    pickTeamId: side === "home" ? TOR.id : NSH.id,
    winProbability: chance,
    final: {
      date,
      startTime: start.toISOString(),
      home: { ...TOR, score: homeWon ? 2 + margin : 2 },
      away: { ...NSH, score: homeWon ? 2 : 2 + margin },
    },
  };
}

const undecided = (gameId: string): SeasonPick => ({
  gameId,
  pickTeamId: TOR.id,
  winProbability: 61,
  final: null,
});

// Monday 5 October 2026 to Sunday 11 October, and the Monday after.
const MON = "2026-10-05";
const TUE = "2026-10-06";
const WED = "2026-10-07";
const SUN = "2026-10-11";
const NEXT_MON = "2026-10-12";

describe("a week", () => {
  it("is Monday to Sunday, whatever day it is asked on", () => {
    for (const day of [MON, WED, SUN]) expect(weekOf(day)).toEqual({ start: MON, end: SUN });
    expect(weekOf(NEXT_MON)).toEqual({ start: NEXT_MON, end: "2026-10-18" });
    // Across a month's and a year's end.
    expect(weekOf("2027-01-01")).toEqual({ start: "2026-12-28", end: "2027-01-03" });
  });
});

describe("the figures with nothing to count", () => {
  it("are all empty before the first pick", () => {
    expect(picksFigures([], WED)).toEqual({
      season: { right: 0, wrong: 0 },
      awaiting: 0,
      run: null,
      week: null,
      bands: BANDS.map((band) => ({ ...band, right: 0, wrong: 0 })),
      sides: { home: { right: 0, wrong: 0 }, road: { right: 0, wrong: 0 } },
    });
  });

  it("count a pick with no result as awaiting one, and as neither right nor wrong", () => {
    // A game still to come and a postponed one are the same to D1: a pick and no final.
    const figures = picksFigures([undecided("tonight"), undecided("postponed")], WED);

    expect(figures.season).toEqual({ right: 0, wrong: 0 });
    expect(figures.awaiting).toBe(2);
    expect(figures.week).toBeNull();
    expect(figures.run).toBeNull();
  });

  it("leave out a final with no winner", () => {
    const level = pick(TUE, "home", "won", 60, 0);

    expect(picksFigures([level], WED)).toMatchObject({
      season: { right: 0, wrong: 0 },
      awaiting: 0,
      week: null,
    });
  });
});

describe("the season", () => {
  const picks = [
    pick(MON, "home", "won", 52),
    pick(MON, "road", "lost", 54),
    pick(TUE, "home", "won", 55),
    pick(TUE, "home", "lost", 60),
    pick(WED, "road", "won", 64),
    pick(WED, "home", "won", 65),
    pick(WED, "home", "won", 81),
    undecided("tonight"),
  ];
  const figures = picksFigures(picks, WED);

  it("is every decided pick, right or wrong", () => {
    expect(figures.season).toEqual({ right: 5, wrong: 2 });
    expect(figures.awaiting).toBe(1);
  });

  it("is split by how sure the pick was, each band holding its lower edge", () => {
    expect(figures.bands).toEqual([
      { from: 50, to: 54, right: 1, wrong: 1 },
      { from: 55, to: 59, right: 1, wrong: 0 },
      { from: 60, to: 64, right: 1, wrong: 1 },
      { from: 65, to: null, right: 2, wrong: 0 },
    ]);
  });

  it("puts a chance between two bands in the lower one, and one under 50 in the first", () => {
    const between = picksFigures(
      [pick(MON, "home", "won", 54.6), pick(MON, "home", "won", 41)],
      WED,
    );

    expect(between.bands[0]).toMatchObject({ right: 2 });
  });

  it("is split by whether the home team or the road team was picked", () => {
    expect(figures.sides).toEqual({
      home: { right: 4, wrong: 1 },
      road: { right: 1, wrong: 1 },
    });
  });
});

describe("the run", () => {
  it("is the picks that ended the same way, counted back from the latest game", () => {
    const picks = [
      pick(MON, "home", "lost"),
      pick(TUE, "home", "won"),
      pick(WED, "home", "won"),
      undecided("tonight"),
    ];

    expect(picksFigures(picks, WED).run).toEqual({ outcome: "right", length: 2 });
    expect(picksFigures([...picks, pick(WED, "road", "lost")], WED).run).toEqual({
      outcome: "wrong",
      length: 1,
    });
  });

  it("follows the order the games started in, not the order the picks were made in", () => {
    // A postponed game played later: its pick is the oldest and its result the newest.
    const picks = [pick(SUN, "home", "lost"), pick(MON, "home", "won"), pick(TUE, "home", "won")];

    expect(picksFigures(picks, NEXT_MON).run).toEqual({ outcome: "wrong", length: 1 });
  });
});

describe("the week", () => {
  it("is this week's decided picks, by day, with days that had none left out", () => {
    const picks = [
      pick("2026-10-04", "home", "lost"),
      pick(MON, "home", "won"),
      pick(MON, "home", "lost"),
      pick(WED, "road", "won"),
      undecided("tonight"),
    ];

    expect(picksFigures(picks, WED).week).toMatchObject({
      start: MON,
      end: SUN,
      current: true,
      tally: { right: 2, wrong: 1 },
      days: [
        { date: MON, right: 1, wrong: 1 },
        { date: WED, right: 1, wrong: 0 },
      ],
    });
  });

  it("is the last week that had a result when this one has none yet", () => {
    const picks = [pick(TUE, "home", "won"), pick(SUN, "home", "lost"), undecided("tonight")];

    expect(picksFigures(picks, NEXT_MON).week).toMatchObject({
      start: MON,
      end: SUN,
      current: false,
      tally: { right: 1, wrong: 1 },
    });
  });

  it("counts a game under the day it was played, so a postponed game is in the week it ended", () => {
    const madeLastWeek = pick(NEXT_MON, "home", "won");

    expect(picksFigures([pick(TUE, "home", "lost"), madeLastWeek], NEXT_MON).week).toMatchObject({
      start: NEXT_MON,
      tally: { right: 1, wrong: 0 },
    });
  });

  it("has the firmest pick that came in as its best call and the firmest that lost as its worst", () => {
    const picks = [
      pick("2026-10-04", "home", "won", 90),
      pick(MON, "home", "won", 55),
      pick(TUE, "road", "won", 66, 3),
      pick(TUE, "home", "lost", 58),
      pick(WED, "home", "lost", 71, 2),
    ];
    const week = picksFigures(picks, WED).week;

    expect(week?.best).toEqual({
      gameId: picks[2]?.gameId,
      date: TUE,
      picked: NSH,
      opponent: TOR,
      pickedHome: false,
      winProbability: 66,
      score: { picked: 5, opponent: 2 },
    });
    expect(week?.worst).toMatchObject({
      gameId: picks[4]?.gameId,
      picked: TOR,
      pickedHome: true,
      winProbability: 71,
      score: { picked: 2, opponent: 4 },
    });
  });

  it("settles two calls as firm as each other by the wider margin, then the later game", () => {
    const narrow = pick(MON, "home", "won", 60, 1);
    const wide = pick(MON, "home", "won", 60, 4);
    const later = pick(TUE, "home", "won", 60, 4);

    expect(picksFigures([narrow, wide], WED).week?.best?.gameId).toBe(wide.gameId);
    expect(picksFigures([later, wide, narrow], WED).week?.best?.gameId).toBe(later.gameId);
  });

  it("has no best call in a week with nothing right, and no worst in one with nothing wrong", () => {
    expect(picksFigures([pick(MON, "home", "lost")], WED).week).toMatchObject({
      best: null,
      worst: { winProbability: 58 },
    });
    expect(picksFigures([pick(MON, "home", "won")], WED).week).toMatchObject({ worst: null });
  });
});
