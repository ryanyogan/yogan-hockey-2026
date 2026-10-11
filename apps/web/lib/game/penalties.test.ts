import type { Play } from "@yogan-hockey/schemas";
import { beforeAll, describe, expect, test } from "vitest";
import { type PenaltyState, penaltyState, strengthLine, timePlayed } from "./penalties";
import { BUFFALO, DALLAS, play, recordedShootout } from "./test-plays";

const REGULAR_SEASON = { homeTeamId: BUFFALO, awayTeamId: DALLAS, seasonType: 2 };
const PLAYOFFS = { ...REGULAR_SEASON, seasonType: 3 };

/** What a test reads of a state: "DAL R. Faksa High-sticking 2:00" for each player in the box. */
function boxed(state: PenaltyState): string[] {
  return state.box.map(({ teamId, player, infraction, remaining, waiting, shortHanded }) =>
    [
      teamId === BUFFALO ? "BUF" : "DAL",
      player ?? "bench",
      infraction,
      clock(remaining),
      ...(waiting ? ["waiting"] : []),
      ...(shortHanded ? [] : ["no skater short"]),
    ].join(" "),
  );
}
const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** "5 on 4 BUF 1:32": away's skaters on home's, who has the advantage, and for how long. */
function strength(state: PenaltyState): string {
  const { skaters, advantage } = state;
  const line = `${skaters.away} on ${skaters.home}`;
  if (advantage == null) return line;
  return `${line} ${advantage.teamId === BUFFALO ? "BUF" : "DAL"} ${clock(advantage.remaining)}`;
}

describe("the recorded game, stepped through as a Replay does", () => {
  let plays: Play[];
  beforeAll(async () => {
    plays = (await recordedShootout()).plays;
  });
  const at = (index: number) => penaltyState(plays.slice(0, index + 1), REGULAR_SEASON);

  // Worked by hand from the recorded plays: Dallas is away and Buffalo home, a play's clock
  // counts up, and a minor is two minutes.
  test.each([
    { index: 50, when: "before the first penalty", box: [], strength: "5 on 5" },
    {
      index: 51,
      when: "Faksa's high-sticking at 9:08 of the 1st",
      box: ["DAL R. Faksa High-sticking 2:00"],
      strength: "4 on 5 BUF 2:00",
    },
    {
      index: 56,
      when: "a missed shot at 10:22, with 46 seconds of it left",
      box: ["DAL R. Faksa High-sticking 0:46"],
      strength: "4 on 5 BUF 0:46",
    },
    { index: 57, when: "a blocked shot at 11:15, after it is up", box: [], strength: "5 on 5" },
    {
      index: 69,
      when: "Lyubushkin's holding at 13:33",
      box: ["DAL I. Lyubushkin Holding 2:00"],
      strength: "4 on 5 BUF 2:00",
    },
    { index: 97, when: "the end of the 1st", box: [], strength: "5 on 5" },
    {
      index: 113,
      when: "Buffalo's short-handed goal at 3:32 of the 2nd, which ends nothing",
      box: ["BUF J. Greenway Interference 0:52"],
      strength: "5 on 4 DAL 0:52",
    },
    {
      index: 117,
      when: "Dallas's power-play goal at 4:24, the second the penalty was up",
      box: [],
      strength: "5 on 5",
    },
    {
      index: 187,
      when: "the faceoff after Schenn's holding at 16:32 of the 2nd",
      box: ["BUF L. Schenn Holding 2:00"],
      strength: "5 on 4 DAL 2:00",
    },
    { index: 188, when: "a shot at 18:32, the second it is up", box: [], strength: "5 on 5" },
    {
      index: 245,
      when: "Timmins's puck over the glass at 13:09 of the 3rd, which names nobody else",
      box: ["BUF C. Timmins Delaying Game - Puck over Glass 2:00"],
      strength: "5 on 4 DAL 2:00",
    },
    {
      index: 281,
      when: "Bourque's hooking in overtime, three on three: Buffalo adds a skater",
      box: ["DAL M. Bourque Hooking 2:00"],
      strength: "3 on 4 BUF 2:00",
    },
    {
      index: 293,
      when: "two seconds before it is up",
      box: ["DAL M. Bourque Hooking 0:02"],
      strength: "3 on 4 BUF 0:02",
    },
    { index: 294, when: "the end of overtime", box: [], strength: "3 on 3" },
    { index: 296, when: "the shootout", box: [], strength: "5 on 5" },
    { index: 306, when: "the whole game laid out", box: [], strength: "5 on 5" },
  ])("play $index, $when", ({ index, box, strength: expected }) => {
    const state = at(index);
    expect(boxed(state)).toEqual(box);
    expect(strength(state)).toBe(expected);
  });

  test("every goal ESPN calls a power-play or short-handed one is scored with a penalty running", () => {
    for (const [index, goal] of plays.entries()) {
      if (!goal.scoring || goal.periodText === "SO") continue;
      // As the ice stood at the play before the goal.
      const before = penaltyState(plays.slice(0, index), REGULAR_SEASON);
      const scorers = goal.teamId === BUFFALO ? "home" : "away";
      const others = scorers === "home" ? "away" : "home";
      const recorded =
        before.skaters[scorers] > before.skaters[others]
          ? "power-play"
          : before.skaters[scorers] < before.skaters[others]
            ? "short-handed"
            : "even-strength";
      expect(`${goal.clock} ${recorded}`).toBe(`${goal.clock} ${goal.strength}`);
    }
  });
});

describe("strengthLine", () => {
  test("is the advantaged team's skaters first", () => {
    expect(strengthLine({ home: 4, away: 5 })).toBe("5 on 4");
    expect(strengthLine({ home: 5, away: 3 })).toBe("5 on 3");
    expect(strengthLine({ home: 4, away: 4 })).toBe("4 on 4");
  });
});

/** A penalty to `teamId`: "9:08" of the 1st unless `over` says another period. */
function penalty(
  teamId: string,
  time: string,
  minutes: number,
  name: string | null,
  over: Partial<Play> = {},
): Play {
  return play({
    type: "Roughing",
    typeText: "Roughing",
    penalty: true,
    penaltyMinutes: minutes,
    teamId,
    clock: time,
    participants: name == null ? [] : [{ athleteId: name, name, shortName: name, role: null }],
    ...over,
  });
}
const goal = (teamId: string, time: string, over: Partial<Play> = {}) =>
  play({ type: "goal", typeText: "Goal", scoring: true, teamId, clock: time, ...over });
/** Any play at all, to say what time it is. */
const faceoff = (time: string, over: Partial<Play> = {}) =>
  play({ type: "faceoff", typeText: "Faceoff", teamId: null, clock: time, ...over });
const SECOND = { period: 2, periodText: "2nd" };
const THIRD = { period: 3, periodText: "3rd" };
const OVERTIME = { period: 4, periodText: "OT" };

describe("the rules", () => {
  type Case = {
    name: string;
    plays: Play[];
    box: string[];
    strength: string;
    game?: typeof PLAYOFFS;
  };
  const benn = penalty(DALLAS, "5:00", 2, "Benn");
  const cases: Case[] = [
    {
      name: "a power-play goal ends a minor",
      plays: [benn, goal(BUFFALO, "5:40")],
      box: [],
      strength: "5 on 5",
    },
    {
      name: "a goal by the team that is short ends nothing",
      plays: [benn, goal(DALLAS, "5:40")],
      box: ["DAL Benn Roughing 1:20"],
      strength: "4 on 5 BUF 1:20",
    },
    {
      name: "a goal before the penalty ends nothing",
      plays: [goal(BUFFALO, "4:00"), benn, faceoff("5:10")],
      box: ["DAL Benn Roughing 1:50"],
      strength: "4 on 5 BUF 1:50",
    },
    {
      name: "two minors to one team are five on three, each on its own clock",
      plays: [benn, penalty(DALLAS, "5:30", 2, "Hintz"), faceoff("6:00")],
      box: ["DAL Benn Roughing 1:00", "DAL Hintz Roughing 1:30"],
      strength: "3 on 5 BUF 1:00",
    },
    {
      name: "a goal at five on three ends the minor with less time left, and it is five on four",
      plays: [benn, penalty(DALLAS, "5:30", 2, "Hintz"), goal(BUFFALO, "6:00")],
      box: ["DAL Hintz Roughing 1:30"],
      strength: "4 on 5 BUF 1:30",
    },
    {
      name: "a minor to each team at different times is four on four until the first is up",
      plays: [benn, penalty(BUFFALO, "6:00", 2, "Tuch"), faceoff("6:30")],
      box: ["DAL Benn Roughing 0:30", "BUF Tuch Roughing 1:30"],
      strength: "4 on 4",
    },
    {
      name: "and then the other team has the advantage for what is left of the second",
      plays: [benn, penalty(BUFFALO, "6:00", 2, "Tuch"), faceoff("7:15")],
      box: ["BUF Tuch Roughing 0:45"],
      strength: "5 on 4 DAL 0:45",
    },
    {
      name: "a goal at four on four ends neither",
      plays: [benn, penalty(BUFFALO, "6:00", 2, "Tuch"), goal(BUFFALO, "6:30")],
      box: ["DAL Benn Roughing 0:30", "BUF Tuch Roughing 1:30"],
      strength: "4 on 4",
    },
    {
      name: "coincidental minors at full strength are four on four, and no goal ends them",
      plays: [benn, penalty(BUFFALO, "5:00", 2, "Tuch"), goal(DALLAS, "5:30")],
      box: ["DAL Benn Roughing 1:30", "BUF Tuch Roughing 1:30"],
      strength: "4 on 4",
    },
    {
      name: "coincidental majors (a fight) put two in the box and nobody short",
      plays: [
        penalty(DALLAS, "5:00", 5, "Benn"),
        penalty(BUFFALO, "5:00", 5, "Tuch"),
        faceoff("7:00"),
      ],
      box: ["DAL Benn Roughing 3:00 no skater short", "BUF Tuch Roughing 3:00 no skater short"],
      strength: "5 on 5",
    },
    {
      name: "coincidental minors during a power play change nothing on the ice",
      plays: [
        benn,
        penalty(DALLAS, "5:30", 2, "Hintz"),
        penalty(BUFFALO, "5:30", 2, "Tuch"),
        faceoff("5:45"),
      ],
      box: [
        "DAL Benn Roughing 1:15",
        "DAL Hintz Roughing 1:45 no skater short",
        "BUF Tuch Roughing 1:45 no skater short",
      ],
      strength: "4 on 5 BUF 1:15",
    },
    {
      name: "two to one team and one to the other at a stoppage leave one to serve",
      plays: [
        benn,
        penalty(BUFFALO, "5:00", 2, "Tuch"),
        penalty(DALLAS, "5:00", 2, "Hintz"),
        faceoff("5:20"),
      ],
      box: [
        "DAL Benn Roughing 1:40 no skater short",
        "BUF Tuch Roughing 1:40 no skater short",
        "DAL Hintz Roughing 1:40",
      ],
      strength: "4 on 5 BUF 1:40",
    },
    {
      name: "a double minor is four minutes",
      plays: [penalty(DALLAS, "5:00", 4, "Benn"), faceoff("6:00")],
      box: ["DAL Benn Roughing 3:00"],
      strength: "4 on 5 BUF 3:00",
    },
    {
      name: "a goal in a double minor's first half ends that half: two minutes from the goal",
      plays: [penalty(DALLAS, "5:00", 4, "Benn"), goal(BUFFALO, "5:40"), faceoff("6:00")],
      box: ["DAL Benn Roughing 1:40"],
      strength: "4 on 5 BUF 1:40",
    },
    {
      name: "a goal in its second half ends it",
      plays: [penalty(DALLAS, "5:00", 4, "Benn"), goal(BUFFALO, "7:40")],
      box: [],
      strength: "5 on 5",
    },
    {
      name: "a major is not ended by a goal, or by two",
      plays: [penalty(DALLAS, "5:00", 5, "Benn"), goal(BUFFALO, "5:40"), goal(BUFFALO, "6:40")],
      box: ["DAL Benn Roughing 3:20"],
      strength: "4 on 5 BUF 3:20",
    },
    {
      name: "a misconduct is ten minutes in the box with nobody short",
      plays: [penalty(DALLAS, "5:00", 10, "Benn"), faceoff("9:00")],
      box: ["DAL Benn Roughing 6:00 no skater short"],
      strength: "5 on 5",
    },
    {
      name: "a minor and a misconduct to one player: the misconduct waits for the minor",
      plays: [benn, penalty(DALLAS, "5:00", 10, "Benn"), faceoff("6:00")],
      box: ["DAL Benn Roughing 1:00", "DAL Benn Roughing 10:00 waiting no skater short"],
      strength: "4 on 5 BUF 1:00",
    },
    {
      name: "and starts when a goal ends the minor",
      plays: [benn, penalty(DALLAS, "5:00", 10, "Benn"), goal(BUFFALO, "6:00"), faceoff("7:00")],
      box: ["DAL Benn Roughing 9:00 no skater short"],
      strength: "5 on 5",
    },
    {
      name: "a major and a minor to one player are served one after the other",
      plays: [penalty(DALLAS, "5:00", 5, "Benn"), benn, faceoff("6:00")],
      box: ["DAL Benn Roughing 4:00", "DAL Benn Roughing 2:00 waiting"],
      strength: "4 on 5 BUF 4:00",
    },
    {
      name: "a third penalty to a team two short waits for the first to end",
      plays: [
        benn,
        penalty(DALLAS, "5:20", 2, "Hintz"),
        penalty(DALLAS, "5:40", 2, "Lindell"),
        faceoff("6:00"),
      ],
      box: [
        "DAL Benn Roughing 1:00",
        "DAL Hintz Roughing 1:20",
        "DAL Lindell Roughing 2:00 waiting",
      ],
      strength: "3 on 5 BUF 1:00",
    },
    {
      name: "and is served once it has",
      plays: [
        benn,
        penalty(DALLAS, "5:20", 2, "Hintz"),
        penalty(DALLAS, "5:40", 2, "Lindell"),
        faceoff("7:10"),
      ],
      box: ["DAL Hintz Roughing 0:10", "DAL Lindell Roughing 1:50"],
      strength: "3 on 5 BUF 0:10",
    },
    {
      name: "a bench minor names nobody",
      plays: [penalty(BUFFALO, "5:00", 2, null, { typeText: "Too Many Men on the Ice" })],
      box: ["BUF bench Too Many Men on the Ice 2:00"],
      strength: "5 on 4 DAL 2:00",
    },
    {
      name: "a penalty shot (no minutes to serve) puts nobody in the box",
      plays: [penalty(DALLAS, "5:00", 0, "Benn")],
      box: [],
      strength: "5 on 5",
    },
    {
      name: "a game misconduct sends its player off, not to the box",
      plays: [penalty(DALLAS, "5:00", 10, "Benn", { typeText: "Game Misconduct" })],
      box: [],
      strength: "5 on 5",
    },
    {
      name: "a penalty stored before the site kept the minutes puts nobody in the box",
      plays: [{ ...benn, penaltyMinutes: undefined }],
      box: [],
      strength: "5 on 5",
    },
    {
      name: "a penalty carries across the intermission",
      plays: [
        penalty(DALLAS, "19:10", 2, "Benn"),
        faceoff("20:00", { type: "period-end" }),
        faceoff("0:00", { ...SECOND, type: "period-start" }),
        faceoff("0:30", SECOND),
      ],
      box: ["DAL Benn Roughing 0:40"],
      strength: "4 on 5 BUF 0:40",
    },
    {
      name: "a power play carried into overtime is four on three",
      plays: [penalty(DALLAS, "19:00", 2, "Benn", THIRD), faceoff("0:10", OVERTIME)],
      box: ["DAL Benn Roughing 0:50"],
      strength: "3 on 4 BUF 0:50",
    },
    {
      name: "two short in overtime is five on three",
      plays: [
        penalty(DALLAS, "1:00", 2, "Benn", OVERTIME),
        penalty(DALLAS, "1:30", 2, "Hintz", OVERTIME),
      ],
      box: ["DAL Benn Roughing 1:30", "DAL Hintz Roughing 2:00"],
      strength: "3 on 5 BUF 1:30",
    },
    {
      name: "a penalty each in overtime is three on three",
      plays: [
        penalty(DALLAS, "1:00", 2, "Benn", OVERTIME),
        penalty(BUFFALO, "1:30", 2, "Tuch", OVERTIME),
      ],
      box: ["DAL Benn Roughing 1:30", "BUF Tuch Roughing 2:00"],
      strength: "3 on 3",
    },
    {
      name: "playoff overtime is played as regulation, and its second overtime starts at 80:00",
      game: PLAYOFFS,
      plays: [
        penalty(DALLAS, "19:00", 2, "Benn", OVERTIME),
        faceoff("0:20", { period: 5, periodText: "2OT" }),
      ],
      box: ["DAL Benn Roughing 0:40"],
      strength: "4 on 5 BUF 0:40",
    },
    {
      name: "a game that is over has nobody in the box",
      plays: [
        penalty(DALLAS, "19:10", 2, "Benn", THIRD),
        faceoff("20:00", { ...THIRD, type: "end-of-game" }),
      ],
      box: [],
      strength: "5 on 5",
    },
  ];
  test.each(cases)("$name", ({ plays, box, strength: expected, game = REGULAR_SEASON }) => {
    const state = penaltyState(plays, game);
    expect(boxed(state)).toEqual(box);
    expect(strength(state)).toBe(expected);
  });
});

describe("the game clock between plays", () => {
  const plays = [penalty(DALLAS, "5:00", 2, "Benn")];
  const left = (clock: { period: number; elapsed: number } | null) =>
    boxed(penaltyState(plays, REGULAR_SEASON, clock));

  test("a later reading of the clock counts the penalty down", () => {
    expect(left({ period: 1, elapsed: 6 * 60 + 15 })).toEqual(["DAL Benn Roughing 0:45"]);
  });

  test("and ends it", () => {
    expect(left({ period: 1, elapsed: 7 * 60 })).toEqual([]);
  });

  test("an earlier reading than the last play is ignored", () => {
    expect(left({ period: 1, elapsed: 4 * 60 })).toEqual(["DAL Benn Roughing 2:00"]);
  });

  test("a scoreboard's clock counts down, and is read as time played", () => {
    expect(timePlayed(1, "13:45", 2)).toEqual({ period: 1, elapsed: 6 * 60 + 15 });
    // Overtime outside the playoffs is five minutes; in them, twenty.
    expect(timePlayed(4, "4:30", 2)).toEqual({ period: 4, elapsed: 30 });
    expect(timePlayed(4, "4:30", 3)).toEqual({ period: 4, elapsed: 15 * 60 + 30 });
  });
});
