import type { ScoreboardGame, ScoreboardSide, StoredPrediction } from "@yogan-hockey/schemas";
import { describe, expect, test } from "vitest";
import {
  agateName,
  briefGame,
  briefPick,
  dateline,
  datelineDate,
  deck,
  gamePickOutcome,
  headline,
  kicker,
  leadsAndBriefs,
  nickname,
  noGames,
  noStandings,
  pickSentence,
  picksNote,
  picksScore,
  rec,
  seasonPicksSentence,
  spelled,
  statusText,
  tonightPicks,
  tonightPicksSentence,
} from "./agate-copy";

/* The clubs of the prototype's two slates (`prototypes/agate/data.js`), as ESPN names them. */
const TEAMS: Record<string, [location: string, shortName: string]> = {
  BUF: ["Buffalo", "Sabres"],
  CAR: ["Carolina", "Hurricanes"],
  CHI: ["Chicago", "Blackhawks"],
  DET: ["Detroit", "Red Wings"],
  FLA: ["Florida", "Panthers"],
  LA: ["Los Angeles", "Kings"],
  MIN: ["Minnesota", "Wild"],
  MTL: ["Montreal", "Canadiens"],
  NJ: ["New Jersey", "Devils"],
  NSH: ["Nashville", "Predators"],
  NYI: ["New York", "Islanders"],
  NYR: ["New York", "Rangers"],
  OTT: ["Ottawa", "Senators"],
  SEA: ["Seattle", "Kraken"],
  STL: ["St. Louis", "Blues"],
  TOR: ["Toronto", "Maple Leafs"],
  UTA: ["Utah", "Mammoth"],
  VAN: ["Vancouver", "Canucks"],
  VGK: ["Vegas", "Golden Knights"],
  WSH: ["Washington", "Capitals"],
};

const EASTERN = "America/New_York";
const WORD_JOINER = "⁠";
/** A sentence as it reads on the page: the word joiners of `rec()` take no room. */
const read = (text: string | null) => text?.replaceAll(WORD_JOINER, "");

type Team = [abbreviation: string, record: string | null, score?: number];

function side(
  [abbreviation, record, score = 0]: Team,
  other: Team,
  final: boolean,
): ScoreboardSide {
  const [location, shortName] = TEAMS[abbreviation] ?? [];
  return {
    id: `id-${abbreviation}`,
    abbreviation,
    location,
    shortName,
    logo: null,
    logoDark: null,
    score,
    winner: final && score > (other[2] ?? 0),
    record,
  };
}

let nextStart = Date.parse("2026-10-06T23:00:00Z");

/** A game of the Scoreboard. Each one made starts a minute after the one before. */
function game(
  status: ScoreboardGame["status"],
  [away, home]: [Team, Team],
  venue: string | null,
  over: Partial<ScoreboardGame> = {},
): ScoreboardGame {
  nextStart += 60_000;
  return {
    id: `${away[0]}-${home[0]}`,
    startTime: new Date(nextStart).toISOString(),
    seasonType: 2,
    status,
    period: status === "final" ? 3 : 0,
    clock: "0:00",
    detail: "",
    venue,
    away: side(away, home, status === "final"),
    home: side(home, away, status === "final"),
    ...over,
  };
}

function pick(
  game: ScoreboardGame,
  abbreviation: string,
  winProbability: number,
): StoredPrediction {
  return {
    gameId: game.id,
    madeAt: "2026-10-06T16:00:00.000Z",
    model: "test",
    inputs: {},
    status: "made",
    pickTeamId: `id-${abbreviation}`,
    winProbability,
    reasoning: "One. Two.",
    keyFactors: [],
  };
}

const failed = (game: ScoreboardGame): StoredPrediction => ({
  gameId: game.id,
  madeAt: "2026-10-06T16:00:00.000Z",
  model: "test",
  inputs: {},
  status: "failed",
});

/* The busy slate of `prototypes/agate/data.js`, in the slate's order. */
const MTL = game(
  "final",
  [
    ["CAR", "1-1-1", 2],
    ["MTL", "1-0-1", 3],
  ],
  "Bell Centre",
);
const TOR = game(
  "final",
  [
    ["NSH", "1-1-0", 3],
    ["TOR", "1-2-0", 4],
  ],
  "Scotiabank Arena",
  { period: 4 },
);
const DET = game(
  "final",
  [
    ["OTT", "2-0-0", 4],
    ["DET", "0-2-0", 1],
  ],
  "Little Caesars Arena",
);
const NJ = game(
  "live",
  [
    ["UTA", "2-1-0", 2],
    ["NJ", "1-1-0", 2],
  ],
  "Prudential Center",
  { period: 3, clock: "18:44" },
);
const BUF = game(
  "live",
  [
    ["MIN", "2-0-0", 3],
    ["BUF", "1-1-0", 3],
  ],
  "KeyBank Center",
  { period: 4, clock: "2:10" },
);
const NYR_LIVE = game(
  "live",
  [
    ["NYI", "1-1-0", 1],
    ["NYR", "3-1-0", 2],
  ],
  "Madison Square Garden",
  { period: 3, clock: "9:02" },
);
const CHI = game(
  "live",
  [
    ["STL", "1-1-0", 0],
    ["CHI", "0-3-0", 1],
  ],
  "United Center",
  { period: 2, clock: "14:20" },
);
const SEA = game(
  "scheduled",
  [
    ["VGK", "2-1-0"],
    ["SEA", "2-1-0"],
  ],
  "Climate Pledge Arena",
  { startTime: "2026-10-07T00:40:00.000Z" },
);
const LA = game(
  "scheduled",
  [
    ["FLA", "1-0-2"],
    ["LA", "0-1-1"],
  ],
  "crypto.com Arena",
  { startTime: "2026-10-07T01:00:00.000Z" },
);
const BUSY = [MTL, TOR, DET, NJ, BUF, NYR_LIVE, CHI, SEA, LA];
const BUSY_PICKS = new Map<string, StoredPrediction>([
  [MTL.id, pick(MTL, "MTL", 52)],
  [TOR.id, pick(TOR, "TOR", 58)],
  [NJ.id, pick(NJ, "NJ", 61)],
  [BUF.id, pick(BUF, "BUF", 64)],
  [NYR_LIVE.id, pick(NYR_LIVE, "NYR", 53)],
  [CHI.id, pick(CHI, "CHI", 56)],
  [SEA.id, pick(SEA, "SEA", 59)],
  [LA.id, pick(LA, "LA", 62)],
]);

/* The slate of Oct 11 (`tonight` in the prototype). */
const WSH = game(
  "final",
  [
    ["SEA", "4-2-0", 5],
    ["WSH", "3-2-0", 3],
  ],
  "Capital One Arena",
);
const NYR = game(
  "final",
  [
    ["VAN", "2-5-0", 2],
    ["NYR", "5-2-0", 6],
  ],
  "Madison Square Garden",
);

describe("the HANDOFF's copy test cases", () => {
  const cases: [
    name: string,
    game: ScoreboardGame,
    prediction: StoredPrediction | null,
    kicker: string,
    headline: string,
    deck: string,
    outcome: "right" | "wrong" | null,
  ][] = [
    [
      "SEA 5 @ WSH 3, final, pick WSH",
      WSH,
      pick(WSH, "WSH", 63),
      "Final · Capital One Arena",
      "Kraken 5, Capitals 3",
      "The Kraken win on the road and move to 4-2-0. The Capitals fall to 3-2-0.",
      "wrong",
    ],
    [
      "VAN 2 @ NYR 6, final, pick NYR",
      NYR,
      pick(NYR, "NYR", 62),
      "Final · Madison Square Garden",
      "Rangers 6, Canucks 2",
      "The Rangers win at home and move to 5-2-0. The Canucks fall to 2-5-0.",
      "right",
    ],
    [
      "NSH 3 @ TOR 4, Final/OT, pick TOR",
      TOR,
      pick(TOR, "TOR", 58),
      "Final/OT · Scotiabank Arena",
      "Maple Leafs 4, Predators 3",
      "The Maple Leafs win at home in overtime and move to 1-2-0. The Predators fall to 1-1-0.",
      "right",
    ],
    [
      "OTT 4 @ DET 1, final, no pick",
      DET,
      null,
      "Final · Little Caesars Arena",
      "Senators 4, Red Wings 1",
      "The Senators win on the road and move to 2-0-0. The Red Wings fall to 0-2-0.",
      null,
    ],
    [
      "UTA 2 @ NJ 2, live 3rd 18:44",
      NJ,
      pick(NJ, "NJ", 61),
      "Live · 3rd 18:44 · Prudential Center",
      "Mammoth 2, Devils 2",
      "Tied 2–2 in the 3rd.",
      null,
    ],
    [
      "MIN 3 @ BUF 3, live OT 2:10",
      BUF,
      pick(BUF, "BUF", 64),
      "Live · OT 2:10 · KeyBank Center",
      "Wild 3, Sabres 3",
      "Tied in overtime.",
      null,
    ],
    [
      "NYI 1 @ NYR 2, live 3rd 9:02",
      NYR_LIVE,
      pick(NYR_LIVE, "NYR", 53),
      "Live · 3rd 9:02 · Madison Square Garden",
      "Islanders 1, Rangers 2",
      "The Rangers lead by 1 in the 3rd.",
      null,
    ],
    [
      "VGK @ SEA, 8:40 PM",
      SEA,
      pick(SEA, "SEA", 59),
      "8:40 PM · Climate Pledge Arena",
      "Golden Knights at Kraken",
      "The Golden Knights (2-1-0) visit the Kraken (2-1-0).",
      null,
    ],
  ];

  test.each(cases)("%s", (_name, each, prediction, kick, head, sentence, outcome) => {
    expect(kicker(each, EASTERN)).toBe(kick);
    expect(headline(each)).toBe(head);
    expect(read(deck(each))).toBe(sentence);
    expect(gamePickOutcome(prediction, each)).toBe(outcome);
  });
});

describe("leads and briefs", () => {
  test("the busy slate leads with three live games and briefs the rest in the slate's order", () => {
    const { leads, briefs } = leadsAndBriefs(BUSY);

    expect(leads).toEqual([NJ, BUF, NYR_LIVE]);
    expect(briefs.map(briefGame)).toEqual([
      "Montreal 3, Carolina 2",
      "Toronto 4, Nashville 3",
      "Ottawa 4, Detroit 1",
      "St. Louis 0, Chicago 1",
      "Vegas at Seattle",
      "Florida at Los Angeles",
    ]);
  });

  test("the order is the slate's stable one, however the feed arrives", () => {
    const { leads, briefs } = leadsAndBriefs(BUSY.toReversed());

    expect(leads).toEqual([NJ, BUF, NYR_LIVE]);
    expect(briefs).toEqual([MTL, TOR, DET, CHI, SEA, LA]);
  });

  test("after the live games come the next to start, then the latest finals", () => {
    expect(leadsAndBriefs([MTL, TOR, DET, NJ, SEA, LA]).leads).toEqual([NJ, SEA, LA]);
    expect(leadsAndBriefs([MTL, TOR, DET, NJ, SEA]).leads).toEqual([DET, NJ, SEA]);
    expect(leadsAndBriefs([MTL, TOR, DET, NJ]).leads).toEqual([TOR, DET, NJ]);
  });

  test("a postponed game leads only when nothing else can", () => {
    const off = game(
      "postponed",
      [
        ["CAR", "1-1-1"],
        ["BUF", "1-1-0"],
      ],
      "KeyBank Center",
      {
        detail: "Postponed",
      },
    );

    expect(leadsAndBriefs([off, MTL, TOR, DET]).briefs).toEqual([off]);
    // It starts after the final, so the slate's order puts it second.
    expect(leadsAndBriefs([off, MTL]).leads).toEqual([MTL, off]);
  });

  test("a slate of three or fewer has no briefs, and an empty one has neither", () => {
    expect(leadsAndBriefs([WSH, NYR])).toEqual({ leads: [WSH, NYR], briefs: [] });
    expect(leadsAndBriefs([])).toEqual({ leads: [], briefs: [] });
  });

  test("a brief's status is the kicker's without the building", () => {
    expect([TOR, CHI, SEA].map((each) => statusText(each, EASTERN))).toEqual([
      "Final/OT",
      "Live · 2nd 14:20",
      "8:40 PM",
    ]);
  });

  test("a live brief reads away then home, as a line score does", () => {
    expect(briefGame(NJ)).toBe("Utah 2, New Jersey 2");
  });
});

describe("names", () => {
  test("agate type names a club by its location", () => {
    expect(agateName(SEA.home)).toBe("Seattle");
    expect(agateName(CHI.away)).toBe("St. Louis");
  });

  test("the two New York clubs are told apart", () => {
    expect(agateName(NYR_LIVE.home)).toBe("N.Y. Rangers");
    expect(agateName(NYR_LIVE.away)).toBe("N.Y. Islanders");
    expect(briefGame(NYR_LIVE)).toBe("N.Y. Islanders 1, N.Y. Rangers 2");
  });

  test("a headline uses the nickname", () => {
    expect(nickname(TOR.home)).toBe("Maple Leafs");
  });

  test("a side stored before the names were carried goes by its abbreviation", () => {
    const { location: _location, shortName: _shortName, ...old } = WSH.home;
    const { location: _l, shortName: _s, ...oldAway } = WSH.away;
    const stored: ScoreboardGame = { ...WSH, home: old, away: oldAway };

    expect(agateName(old)).toBe("WSH");
    expect(nickname(old)).toBe("WSH");
    expect(headline(stored)).toBe("SEA 5, WSH 3");
    expect(briefGame(stored)).toBe("SEA 5, WSH 3");
    expect(read(deck(stored))).toBe(
      "The SEA win on the road and move to 4-2-0. The WSH fall to 3-2-0.",
    );
    expect(agateName({ abbreviation: "NYR" })).toBe("N.Y. Rangers");
  });
});

describe("records", () => {
  test("a record never breaks: word joiners sit around its hyphens", () => {
    expect(rec("4-2-0")).toBe(`4${WORD_JOINER}-${WORD_JOINER}2${WORD_JOINER}-${WORD_JOINER}0`);
    expect(deck(WSH)).toContain(rec("4-2-0"));
    expect(deck(SEA)).toContain(`(${rec("2-1-0")})`);
  });

  test("a side with no record is written without one", () => {
    const noRecords = game(
      "final",
      [
        ["SEA", null, 5],
        ["WSH", null, 3],
      ],
      null,
    );
    const toCome = game(
      "scheduled",
      [
        ["VGK", null],
        ["SEA", "2-1-0"],
      ],
      null,
    );

    expect(deck(noRecords)).toBe("The Kraken win on the road.");
    expect(read(deck(toCome))).toBe("The Golden Knights visit the Kraken (2-1-0).");
  });
});

describe("the kicker and the deck in the states the table leaves out", () => {
  test("a game with no building has a kicker of its status alone", () => {
    expect(kicker({ ...WSH, venue: null }, EASTERN)).toBe("Final");
  });

  test("a shootout", () => {
    const final = { ...TOR, period: 5 };
    const live = { ...BUF, period: 5, clock: "0:00" };

    expect(kicker(final, EASTERN)).toBe("Final/SO · Scotiabank Arena");
    expect(read(deck(final))).toBe(
      "The Maple Leafs win at home in a shootout and move to 1-2-0. The Predators fall to 1-1-0.",
    );
    expect(kicker(live, EASTERN)).toBe("Live · SO · KeyBank Center");
    expect(deck(live)).toBe("Tied 3–3 in the shootout.");
  });

  test("an intermission", () => {
    const tied = { ...NJ, period: 2, clock: "0:00" };
    const led = { ...NYR_LIVE, period: 1, clock: "0:00" };

    expect(kicker(tied, EASTERN)).toBe("Live · End 2nd · Prudential Center");
    expect(deck(tied)).toBe("Tied 2–2 after the 2nd.");
    expect(deck(led)).toBe("The Rangers lead by 1 after the 1st.");
    expect(deck({ ...BUF, clock: "0:00" })).toBe("Tied 3–3 after overtime.");
  });

  test("playoff overtimes past the first are still overtime", () => {
    const playoff = { ...BUF, seasonType: 3, period: 5, clock: "11:02" };

    expect(kicker(playoff, EASTERN)).toBe("Live · 2OT 11:02 · KeyBank Center");
    expect(deck(playoff)).toBe("Tied in overtime.");
    expect(read(deck({ ...TOR, seasonType: 3, period: 5 }))).toContain("win at home in overtime");
  });

  test("the away side leading", () => {
    expect(deck({ ...NJ, away: { ...NJ.away, score: 4 } })).toBe(
      "The Mammoth lead by 2 in the 3rd.",
    );
  });

  test("a game ESPN calls live before the puck drops reads as one to come", () => {
    const warmUp = { ...SEA, status: "live" as const, period: 0 };

    expect(kicker(warmUp, EASTERN)).toBe("Live · Climate Pledge Arena");
    expect(headline(warmUp)).toBe("Golden Knights at Kraken");
    expect(briefGame(warmUp)).toBe("Vegas at Seattle");
    expect(read(deck(warmUp))).toBe("The Golden Knights (2-1-0) visit the Kraken (2-1-0).");
  });

  test("a postponed game says so in ESPN's own word", () => {
    const off = { ...SEA, status: "postponed" as const, detail: "Postponed" };
    const canceled = { ...off, detail: "Canceled" };

    expect(kicker(off, EASTERN)).toBe("Postponed · Climate Pledge Arena");
    expect(headline(off)).toBe("Golden Knights at Kraken");
    expect(deck(off)).toBe("Postponed.");
    expect(briefGame(off)).toBe("Vegas at Seattle");
    expect(statusText(canceled, EASTERN)).toBe("Canceled");
    expect(deck(canceled)).toBe("Canceled.");
    expect(deck({ ...off, detail: "" })).toBe("Postponed.");
  });

  test("a start time is the visitor's when a zone is given", () => {
    expect(kicker(SEA, "America/Los_Angeles")).toBe("5:40 PM · Climate Pledge Arena");
  });
});

describe("the pick", () => {
  test("the pick line names the club in agate type, with its chance", () => {
    expect(pickSentence(pick(WSH, "WSH", 63), WSH)).toBe("Our pick: Washington, 63%.");
    expect(pickSentence(pick(NYR, "NYR", 61.6), NYR)).toBe("Our pick: N.Y. Rangers, 62%.");
  });

  test("a brief's pick is the abbreviation and the chance", () => {
    expect(briefPick(pick(SEA, "SEA", 59), SEA)).toBe("SEA 59%");
  });

  test("no pick, a failed one, and one for a club not in the game say nothing", () => {
    for (const none of [null, undefined, failed(WSH), pick(WSH, "TOR", 63)]) {
      expect(pickSentence(none, WSH)).toBeNull();
      expect(briefPick(none, WSH)).toBeNull();
      expect(gamePickOutcome(none, WSH)).toBeNull();
    }
  });

  test("a pick is marked only once its game is final", () => {
    expect(gamePickOutcome(pick(NYR_LIVE, "NYR", 53), NYR_LIVE)).toBeNull();
    expect(gamePickOutcome(pick(SEA, "SEA", 59), SEA)).toBeNull();
    expect(gamePickOutcome(pick(SEA, "SEA", 59), { ...SEA, status: "postponed" })).toBeNull();
  });
});

describe("tonight's tally and the season", () => {
  test("only picked finals are counted", () => {
    // Three finals, one of them without a pick; the live picks are not decided.
    expect(tonightPicks(BUSY, BUSY_PICKS)).toEqual({ right: 2, decided: 2 });
    expect(tonightPicks([WSH, NYR], new Map([[WSH.id, pick(WSH, "WSH", 63)]]))).toEqual({
      right: 0,
      decided: 1,
    });
    expect(tonightPicks(BUSY, new Map())).toEqual({ right: 0, decided: 0 });
  });

  test("the tally is a sentence with its numbers spelled out", () => {
    expect(tonightPicksSentence({ right: 2, decided: 3 })).toBe("Two of three tonight.");
    expect(tonightPicksSentence({ right: 1, decided: 1 })).toBe("One of one tonight.");
    expect(tonightPicksSentence({ right: 10, decided: 10 })).toBe("Ten of ten tonight.");
    expect(tonightPicksSentence({ right: 0, decided: 2 })).toBe("None of two tonight.");
  });

  test("numbers past ten are figures", () => {
    expect(tonightPicksSentence({ right: 9, decided: 11 })).toBe("Nine of 11 tonight.");
    expect(tonightPicksSentence({ right: 11, decided: 12 })).toBe("11 of 12 tonight.");
    expect(spelled(3)).toBe("Three");
    expect(spelled(3, false)).toBe("three");
  });

  test("nothing decided tonight is no sentence", () => {
    expect(tonightPicksSentence({ right: 0, decided: 0 })).toBeNull();
  });

  test("the season is a share of the games decided", () => {
    expect(seasonPicksSentence({ right: 29, wrong: 14 })).toBe(
      "Right on 67% of games this season.",
    );
    expect(seasonPicksSentence({ right: 0, wrong: 0 })).toBeNull();
    expect(seasonPicksSentence(null)).toBeNull();
  });

  test("The Picks box: the record, then both sentences", () => {
    const record = { right: 29, wrong: 14 };

    expect(picksScore(record)).toBe("29–14");
    expect(picksScore(null)).toBeNull();
    expect(picksNote(record, { right: 2, decided: 3 })).toBe(
      "Right on 67% of games this season. Two of three tonight.",
    );
    expect(picksNote(record, { right: 0, decided: 0 })).toBe("Right on 67% of games this season.");
    expect(picksNote(null, { right: 1, decided: 1 })).toBe("One of one tonight.");
    expect(picksNote(null, { right: 0, decided: 0 })).toBeNull();
  });
});

describe("the dateline", () => {
  const TONIGHT = { date: "2026-10-11", games: [WSH, NYR, MTL] };
  const record = { right: 29, wrong: 14 };

  test("the date is written out, and short for the phone's top bar", () => {
    expect(datelineDate("2026-10-11")).toBe("Sunday, October 11");
    expect(datelineDate("2026-10-11", "short")).toBe("Sun, Oct 11");
    expect(datelineDate(null)).toBeNull();
  });

  test("the desktop's three parts, with zero counts dropped", () => {
    expect(dateline(TONIGHT, record).wide).toEqual([
      "Sunday, October 11",
      "Tonight: 3 games · 3 final",
      "Picks this season: 29 right, 14 wrong",
    ]);
    expect(dateline({ date: "2026-10-06", games: BUSY }, { right: 3, wrong: 2 }).wide).toEqual([
      "Tuesday, October 6",
      "Tonight: 9 games · 4 live · 2 to come · 3 final",
      "Picks this season: 3 right, 2 wrong",
    ]);
  });

  test("the phone's one line leaves out the games to come", () => {
    expect(dateline(TONIGHT, record).narrow).toBe("3 games · 3 final · Picks 29–14");
    expect(dateline({ date: "2026-10-06", games: BUSY }, { right: 3, wrong: 2 }).narrow).toBe(
      "9 games · 4 live · 3 final · Picks 3–2",
    );
  });

  test("one game is a game, and a day off says so", () => {
    expect(dateline({ date: "2026-10-11", games: [SEA] }, record)).toEqual({
      wide: [
        "Sunday, October 11",
        "Tonight: 1 game · 1 to come",
        "Picks this season: 29 right, 14 wrong",
      ],
      narrow: "1 game · Picks 29–14",
    });
    expect(dateline({ date: "2026-10-11", games: [] }, record)).toEqual({
      wide: ["Sunday, October 11", "Tonight: no games", "Picks this season: 29 right, 14 wrong"],
      narrow: "No games · Picks 29–14",
    });
  });

  test("a postponed game is counted on the desktop", () => {
    const off = { ...LA, status: "postponed" as const };

    expect(dateline({ date: "2026-10-11", games: [WSH, off] }, null).wide[1]).toBe(
      "Tonight: 2 games · 1 final · 1 postponed",
    );
  });

  test("before any pick is decided, and before the first poll, the parts not known are dropped", () => {
    expect(dateline(TONIGHT, null)).toEqual({
      wide: ["Sunday, October 11", "Tonight: 3 games · 3 final"],
      narrow: "3 games · 3 final",
    });
    expect(dateline(TONIGHT, { right: 0, wrong: 0 }).wide).toHaveLength(2);
    expect(dateline({ date: null, games: [] }, null)).toEqual({ wide: [], narrow: "" });
  });
});

describe("a time the server writes", () => {
  test("is marked with its zone, and nothing else is", () => {
    expect(kicker(SEA, EASTERN, " ET")).toBe("8:40 PM ET · Climate Pledge Arena");
    expect(statusText(SEA, EASTERN, " ET")).toBe("8:40 PM ET");
    expect(kicker(WSH, EASTERN, " ET")).toBe("Final · Capital One Arena");
  });
});

describe("nothing to draw", () => {
  test("a slate that was not read is not a day off", () => {
    expect(noGames(null)).toBe(
      "Today's games could not be read. They appear here as soon as they can be.",
    );
    expect(noGames("2026-10-06")).toBe("No games scheduled today.");
  });

  test("standings that were not read are not a season yet to start", () => {
    expect(noStandings(false)).toBe("The standings could not be read just now.");
    expect(noStandings(true)).toBe("No standings yet this season.");
  });
});
