import { applyD1Migrations, runInDurableObject } from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import {
  createDb,
  getCurrentPieces,
  getPieceBySlug,
  getRejectedPieces,
  savePiece,
} from "@yogan-hockey/db";
import { translateScoreboard, translateStandings } from "@yogan-hockey/espn";
import type { Game, StoredPrediction } from "@yogan-hockey/schemas";
import { getAgentByName } from "agents";
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import recordedSlate from "../../../packages/espn/fixtures/scoreboard.json";
import recordedFinals from "../../../packages/espn/fixtures/scoreboard-20261003.json";
import recordedStandings from "../../../packages/espn/fixtures/standings.json";
import { readColumns } from "../lib/home-pieces";
import {
  type EditionSources,
  MORNING_CRON,
  NIGHT_CRON,
  NIGHT_LOOK_SECONDS,
  NIGHT_LOOKS,
  PICKS_WAIT_SECONDS,
  type WriterAgent,
} from "./writer-agent";
import { writingFacts } from "./writing/facts";
import {
  WRITING_DAILY_MODEL_CALLS,
  WRITING_FALLBACK_MODEL,
  WRITING_MODEL,
  type WritingRequest,
} from "./writing/kinds";

/** Ahead of the real clock, so no schedule is due by itself. 14:00 UTC is 9 a.m. Eastern. */
const NOW = Date.parse("2031-01-15T14:00:00Z");
const TODAY = "2031-01-15";
const MORNING = Date.parse("2031-01-15T15:00:00Z");
/** 05:00 UTC on the 16th is midnight Eastern as the 15th ends. */
const NIGHT = Date.parse("2031-01-16T05:00:00Z");
/** After the morning's run, for a test of the night's: a Writer started now has only that due. */
const EVENING = Date.parse("2031-01-15T23:00:00Z");

const db = createDb(env.DB);

/** A slate still to be played, and one that is over, from ESPN's recorded responses. */
const scheduled = translateScoreboard(recordedSlate, TODAY).games;
const finals = translateScoreboard(recordedFinals, TODAY).games;
const standings = translateStandings(recordedStandings);

function sources(overrides: Partial<EditionSources> = {}): EditionSources {
  return {
    date: TODAY,
    standings,
    finals: [],
    slate: scheduled,
    predictions: new Map(),
    unfinished: true,
    ...overrides,
  };
}
const playedOut = () =>
  sources({
    slate: finals,
    finals: finals.map((game) => ({ game, plays: null })),
    unfinished: false,
  });

/** A piece that breaks no rule whatever the facts: it names nobody and gives no figure. */
const SOUND = {
  headline: "A full night around the league",
  paragraphs: [
    "The league played a full night, and most of the games were close. The home sides had the better of it, as they often do early in a season, and a few of the visitors left with nothing to show for a long trip.",
    "The standings are still young. A good week moves a club a long way at this time of year, and a bad one does the same in the other direction. Nobody has played enough games for the table to mean much yet.",
  ],
};
/** A piece the check refuses: a player the facts do not hold, quoted. */
const UNSOUND = {
  ...SOUND,
  paragraphs: [...SOUND.paragraphs, `Connor McDavid said it was "a good night" for hockey.`],
};

type ModelCall = { model: string; request: WritingRequest; options: object };
let calls: ModelCall[];
/** What the model answers on each call. */
let answer: (call: ModelCall) => unknown;
const answering = (piece: unknown) => ({
  choices: [{ message: { content: JSON.stringify(piece) } }],
});

let errors: ReturnType<typeof vi.spyOn>;
const logged = () => errors.mock.calls.map((call: unknown[]) => String(call[0]));

async function writer(
  name: string,
  read: () => EditionSources | Promise<EditionSources> = sources,
  startedAt = NOW,
) {
  vi.setSystemTime(startedAt);
  const stub = await getAgentByName(exports.WriterAgent, name);
  await runInDurableObject(stub, (instance: WriterAgent) => {
    const AI = {
      run: async (model: string, request: WritingRequest, options: object) => {
        const call = { model, request, options };
        calls.push(call);
        return answer(call);
      },
    };
    Object.assign(instance, { env: { ...env, AI } });
    vi.spyOn(instance, "gatherSources").mockImplementation(async () => read());
    // The Scoreboard is another Agent's business: here it is only seen to be woken.
    vi.spyOn(
      instance as unknown as { wakeScoreboard(): Promise<void> },
      "wakeScoreboard",
    ).mockResolvedValue();
  });
  return stub;
}
type Stub = Awaited<ReturnType<typeof writer>>;

/** Moves the clock to an instant and runs every timer that has come due, and those they set. */
async function runAt(stub: Stub, instant: number, runs = 12): Promise<void> {
  vi.setSystemTime(instant);
  await runInDurableObject(stub, async (instance: WriterAgent) => {
    for (let run = 0; run < runs; run++) await instance.alarm();
  });
}
const pendingCallbacks = (stub: Stub) =>
  runInDurableObject(stub, async (instance: WriterAgent) =>
    (await instance.listSchedules()).map(({ callback, time }) => [callback, time * 1000]),
  );

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"], now: NOW });
  calls = [];
  answer = () => answering(SOUND);
  errors = vi.spyOn(console, "error").mockImplementation(() => {});
  // The tests share one database, and "the current pieces" is a question about all of it.
  await env.DB.exec("delete from pieces");
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("the schedule", () => {
  test("the Writer sets its two schedules as it starts, and once only", async () => {
    const stub = await getAgentByName(exports.WriterAgent, "schedules");

    const first = await stub.wake();
    const second = await stub.wake();

    const wanted = [
      { callback: "morning", cron: MORNING_CRON },
      { callback: "night", cron: NIGHT_CRON },
    ];
    expect(first).toEqual(expect.arrayContaining(wanted));
    expect(second).toHaveLength(2);
    expect(await pendingCallbacks(stub)).toEqual(
      expect.arrayContaining([
        ["morning", MORNING],
        ["night", NIGHT],
      ]),
    );
  });

  test("a schedule left with another hour by an earlier deploy is replaced", async () => {
    const stub = await getAgentByName(exports.WriterAgent, "old-hour");
    await runInDurableObject(stub, async (instance: WriterAgent) => {
      for (const { id } of await instance.listSchedules()) await instance.cancelSchedule(id);
      await instance.schedule("0 9 * * *", "morning");
      await instance.onStart();
    });

    expect(await stub.wake()).toEqual(
      expect.arrayContaining([
        { callback: "morning", cron: MORNING_CRON },
        { callback: "night", cron: NIGHT_CRON },
      ]),
    );
    expect(await stub.wake()).toHaveLength(2);
  });

  test("before the slate it wakes the Scoreboard, waits for the picks, then writes the preview and the league note", async () => {
    const stub = await writer("morning");

    await runAt(stub, MORNING);

    // Nothing is written yet: the day's Predictions are being made.
    expect(calls).toHaveLength(0);
    const woken = await runInDurableObject(
      stub,
      (instance: WriterAgent) =>
        vi.mocked((instance as unknown as { wakeScoreboard(): Promise<void> }).wakeScoreboard).mock
          .calls.length,
    );
    expect(woken).toBe(1);
    expect(await pendingCallbacks(stub)).toContainEqual([
      "writeEdition",
      MORNING + PICKS_WAIT_SECONDS * 1000,
    ]);

    await runAt(stub, MORNING + PICKS_WAIT_SECONDS * 1000);

    const pieces = await getCurrentPieces(db);
    expect(pieces.map(({ slug }) => slug).sort()).toEqual([`${TODAY}-league`, `${TODAY}-preview`]);
    expect(calls.map(({ model }) => model)).toEqual([WRITING_MODEL, WRITING_MODEL]);
  });

  test("a stored piece says what it is, when it was written, by which model, and that a model wrote it", async () => {
    const stub = await writer("carries");

    await runAt(stub, MORNING);
    await runAt(stub, MORNING + PICKS_WAIT_SECONDS * 1000);

    expect(await getPieceBySlug(db, `${TODAY}-preview`)).toEqual({
      slug: `${TODAY}-preview`,
      kind: "preview",
      date: TODAY,
      headline: SOUND.headline,
      body: SOUND.paragraphs.join("\n\n"),
      writtenAt: new Date(MORNING + PICKS_WAIT_SECONDS * 1000).toISOString(),
      model: WRITING_MODEL,
      writtenBy: "model",
    });
  });

  test("the model is sent the kind's own facts and nothing else, through the gateway", async () => {
    const stub = await writer("asks");

    await runAt(stub, MORNING);
    await runAt(stub, MORNING + PICKS_WAIT_SECONDS * 1000);

    const preview = calls.find(({ options }) => JSON.stringify(options).includes("preview"));
    const asked = JSON.parse(preview?.request.messages[1]?.content ?? "{}");
    const all = writingFacts(sources());
    expect(asked.facts.slate).toEqual(all.slate);
    expect(asked.facts.finals).toEqual([]);
    // Nine games: eighteen clubs, not the league's thirty-two.
    expect(asked.facts.teams).toHaveLength(18);
    expect(preview?.options).toEqual({
      gateway: { id: "yogan-hockey", skipCache: true, metadata: { piece: `${TODAY}-preview` } },
    });
  });

  test("with no games tonight there is no preview, and the league note is still written", async () => {
    const stub = await writer("no-games", () => sources({ slate: [], unfinished: false }));

    await runAt(stub, MORNING);
    await runAt(stub, MORNING + PICKS_WAIT_SECONDS * 1000);

    expect((await getCurrentPieces(db)).map(({ kind }) => kind)).toEqual(["league"]);
    expect(calls).toHaveLength(1);
  });

  test("after the last final it writes the recap, for the day that is ending", async () => {
    const dates: string[] = [];
    const stub = await writer("night", playedOut, EVENING);
    await runInDurableObject(stub, (instance: WriterAgent) => {
      vi.mocked(instance.gatherSources).mockImplementation(async (_edition, date) => {
        dates.push(date);
        return playedOut();
      });
    });

    await runAt(stub, NIGHT);

    // Midnight Eastern has passed in summer and not in winter: either way the slate is the 15th's.
    expect(dates).toEqual([TODAY]);
    expect((await getCurrentPieces(db)).map(({ slug }) => slug)).toEqual([`${TODAY}-recap`]);
  });

  test("a slate with a game still to finish is looked at again, and written up once it is over", async () => {
    let over = false;
    const stub = await writer("late-game", () => (over ? playedOut() : sources()), EVENING);

    await runAt(stub, NIGHT);

    expect(calls).toHaveLength(0);
    expect(await pendingCallbacks(stub)).toContainEqual([
      "writeEdition",
      NIGHT + NIGHT_LOOK_SECONDS * 1000,
    ]);

    await runAt(stub, NIGHT + NIGHT_LOOK_SECONDS * 1000);
    expect(calls).toHaveLength(0);

    over = true;
    await runAt(stub, NIGHT + 2 * NIGHT_LOOK_SECONDS * 1000);
    expect((await getCurrentPieces(db)).map(({ slug }) => slug)).toEqual([`${TODAY}-recap`]);
  });

  test("a slate that never finishes stops being looked at, and nothing is written about it", async () => {
    const stub = await writer("never-over", sources, EVENING);

    for (let look = 0; look <= NIGHT_LOOKS + 1; look++) {
      await runAt(stub, NIGHT + look * NIGHT_LOOK_SECONDS * 1000, 2);
    }

    expect(calls).toHaveLength(0);
    expect((await pendingCallbacks(stub)).map(([callback]) => callback).sort()).toEqual([
      "morning",
      "night",
    ]);
  });

  test("a piece already published for the date is not written a second time", async () => {
    const stub = await writer("once", playedOut, EVENING);
    await runAt(stub, NIGHT);
    expect(calls).toHaveLength(1);

    await runInDurableObject(stub, (instance: WriterAgent) =>
      instance.writeEdition({ edition: "night", date: TODAY, looks: 0 }),
    );
    await runAt(stub, NIGHT + 1000);

    expect(calls).toHaveLength(1);
  });
});

test("the facts are gathered from ESPN and D1, and a read that fails leaves its part out", async () => {
  vi.useRealTimers();
  vi.stubEnv("ESPN_FIXTURES", "1");
  const stub = await getAgentByName(exports.WriterAgent, "gathers");

  // The recorded responses hold the slate of 2026-10-03 and not the one of the day after.
  const morning = await runInDurableObject(stub, (instance: WriterAgent) =>
    instance.gatherSources("morning", "2026-10-04"),
  );
  const night = await runInDurableObject(stub, (instance: WriterAgent) =>
    instance.gatherSources("night", "2026-10-03"),
  );
  vi.unstubAllEnvs();

  expect(morning.standings?.rows).toHaveLength(32);
  expect(morning.slate).toEqual([]);
  expect(morning.finals).toHaveLength(finals.length);
  expect(morning.finals.every(({ game, plays }) => game.status === "final" && plays === null)).toBe(
    true,
  );
  expect(logged().join("\n")).toContain("Writer: the slate of 2026-10-04 could not be read");
  // At night the finals are the day's own. Their scoring is not recorded, so each goes without.
  expect(night.finals.map(({ game }) => game.id)).toEqual(finals.map(({ id }) => id));
  expect(night.unfinished).toBe(false);
});

describe("a real night through the Agent and the check together", () => {
  // The recorded slate: Buffalo beat Chicago 4-3, and Pittsburgh beat Montreal 6-5 in overtime.
  const recap = (lead: string) => ({
    headline: "Penguins win in overtime as Sabres hold off Blackhawks",
    paragraphs: [
      lead,
      "The Penguins needed overtime to get past the Canadiens, 6-5, in the highest-scoring game of the night. Pittsburgh won at home, and the Canadiens left with a point for getting that far.",
      "The Blackhawks stayed close all night and could not find the tying goal late. Both games were decided by a single goal, which is how most of the night went around the league.",
    ],
  });
  const twoGames = () => {
    const played = finals.filter(({ home }) => ["BUF", "PIT"].includes(home.abbreviation));
    const both = played.map((game) => ({ game, plays: null }));
    return sources({ slate: played, finals: both, unfinished: false });
  };

  test("a recap that says what happened is published", async () => {
    answer = () => answering(recap("The Sabres beat the Blackhawks 4-3 at home."));
    const stub = await writer("true-recap", twoGames, EVENING);

    await runAt(stub, NIGHT);

    expect(logged()).toEqual([]);
    expect((await getPieceBySlug(db, `${TODAY}-recap`))?.headline).toContain("Penguins");
  });

  test("the same recap with the winner turned round is not", async () => {
    answer = () => answering(recap("The Blackhawks beat the Sabres 4-3 on the road."));
    const stub = await writer("false-recap", twoGames, EVENING);

    await runAt(stub, NIGHT);

    expect(await getPieceBySlug(db, `${TODAY}-recap`)).toBeNull();
    expect((await getRejectedPieces(db, `${TODAY}-recap`))[0]).toMatchObject({
      reasons: ['says "The Blackhawks beat the Sabres", and no final in the facts has that result'],
    });
  });

  test("a slate that could not be read at night is looked at again, not taken for an empty one", async () => {
    vi.useRealTimers();
    vi.stubEnv("ESPN_FIXTURES", "1");
    const stub = await getAgentByName(exports.WriterAgent, "unread-slate");

    const night = await runInDurableObject(stub, (instance: WriterAgent) =>
      instance.gatherSources("night", "2026-10-04"),
    );
    vi.unstubAllEnvs();

    expect(night.slate).toEqual([]);
    expect(night.unfinished).toBe(true);
  });
});

describe("the Picks page's columns", () => {
  /** A pick of a finished game as D1 holds it, on its winner or its loser. */
  const seasonPick = (game: Game, on: "winner" | "loser", chance: number, date: string) => {
    const side = ({ id, abbreviation, name, score }: Game["home"]) => ({
      id,
      abbreviation,
      name,
      score,
    });
    const winner = game.home.score > game.away.score ? game.home : game.away;
    const loser = winner === game.home ? game.away : game.home;
    return {
      gameId: game.id,
      pickTeamId: (on === "winner" ? winner : loser).id,
      winProbability: chance,
      final: {
        date,
        startTime: `${date}T23:00:00.000Z`,
        home: side(game.home),
        away: side(game.away),
      },
    };
  };
  const [first, second, third] = finals as [Game, Game, Game];
  /** A week with a miss on the Monday and two right since. */
  const seasonPicks = [
    seasonPick(first, "loser", 66, "2031-01-13"),
    seasonPick(second, "winner", 58, "2031-01-13"),
    seasonPick(third, "winner", 61, "2031-01-14"),
  ];
  const [tonight] = scheduled as [Game];
  const predictions = new Map<string, StoredPrediction>([
    [
      tonight.id,
      {
        gameId: tonight.id,
        status: "made",
        pickTeamId: tonight.home.id,
        winProbability: 61,
        reasoning: "The home side has the better record.",
        keyFactors: [],
        madeAt: "2031-01-15T15:05:00.000Z",
        model: WRITING_MODEL,
        inputs: {},
      },
    ],
  ]);
  const withPicks = () => sources({ seasonPicks, predictions });
  const COLUMNS = [`${TODAY}-picks-tonight`, `${TODAY}-picks-miss`, `${TODAY}-picks-run`];
  const pieceOf = ({ options }: ModelCall) =>
    (options as { gateway: { metadata: { piece: string } } }).gateway.metadata.piece;
  const morning = async (name: string, read = withPicks) => {
    const stub = await writer(name, read);
    await runAt(stub, MORNING);
    await runAt(stub, MORNING + PICKS_WAIT_SECONDS * 1000, 24);
    return stub;
  };

  test("the morning writes them after Home's pieces, each from its own facts in a columnist's voice", async () => {
    await morning("columns");

    expect(calls.map(pieceOf)).toEqual([`${TODAY}-preview`, `${TODAY}-league`, ...COLUMNS]);
    expect((await readColumns(new Date(Date.now())))?.map(({ slug }) => slug)).toEqual(COLUMNS);
    for (const call of calls) {
      const [system, user] = call.request.messages;
      if (!system || !user) throw new Error("A request has two messages");
      const column = pieceOf(call).includes("-picks-");
      expect(system.content.includes("columnist")).toBe(column);
      expect("picksRecord" in JSON.parse(user.content).facts).toBe(column);
    }
    const miss = JSON.parse(calls[3]?.request.messages[1]?.content ?? "{}").facts;
    expect(miss.picks.worst.pick).toMatchObject({ winProbability: 66, outcome: "wrong" });
    expect(miss.picks.run).toEqual({ outcome: "right", length: 2 });
  });

  test("a column with nothing to say is not written: no pick tonight, no miss this week, no run", async () => {
    const quiet = () => sources({ seasonPicks: [seasonPick(second, "winner", 58, "2031-01-13")] });

    await morning("quiet", quiet);

    expect(calls.map(pieceOf)).toEqual([`${TODAY}-preview`, `${TODAY}-league`]);
    expect(await readColumns(new Date(Date.now()))).toBeNull();
  });

  test("before a pick is decided, and when the picks cannot be read, no column is written", async () => {
    await morning("none-decided", () => sources({ seasonPicks: [] }));
    await env.DB.exec("delete from pieces");
    await morning("unread", () => sources({ seasonPicks: null }));

    expect(calls.map(pieceOf)).toEqual([
      `${TODAY}-preview`,
      `${TODAY}-league`,
      `${TODAY}-preview`,
      `${TODAY}-league`,
    ]);
  });

  test("columns the check refuses at every try are never read by the page, and Home's pieces are written first", async () => {
    answer = (call) => answering(pieceOf(call).includes("-picks-") ? UNSOUND : SOUND);

    await morning("refused");

    expect(calls.map(pieceOf).slice(0, 2)).toEqual([`${TODAY}-preview`, `${TODAY}-league`]);
    // Three tries each for the three columns, after one each for Home's two.
    expect(calls).toHaveLength(2 + 3 * 3);
    expect(await readColumns(new Date(Date.now()))).toBeNull();
    for (const slug of COLUMNS) {
      expect(await getPieceBySlug(db, slug)).toBeNull();
      expect(await getRejectedPieces(db, slug)).toHaveLength(3);
    }
    expect((await getCurrentPieces(db)).map(({ kind }) => kind).sort()).toEqual([
      "league",
      "preview",
    ]);
  });

  test("the night's recap is still written on a day when every piece of the morning took every try", async () => {
    answer = () => answering(UNSOUND);
    const stub = await morning("worst-day");
    expect(calls).toHaveLength(5 * 3);

    answer = () => answering(SOUND);
    await runInDurableObject(stub, (instance: WriterAgent) => {
      vi.mocked(instance.gatherSources).mockImplementation(async () => playedOut());
      return instance.writeEdition({ edition: "night", date: TODAY, looks: 0 });
    });
    await runAt(stub, EVENING);

    expect((await getCurrentPieces(db)).map(({ slug }) => slug)).toEqual([`${TODAY}-recap`]);
    expect(calls.length).toBeLessThanOrEqual(WRITING_DAILY_MODEL_CALLS);
  });
});

describe("a piece that fails", () => {
  /** Yesterday's recap, which is what a page shows until tonight's is good. */
  const lastGood = async () => {
    await savePiece(db, {
      slug: "2031-01-14-recap",
      kind: "recap",
      date: "2031-01-14",
      status: "published",
      headline: "Yesterday's recap",
      body: "It was written yesterday.",
      writtenAt: "2031-01-15T05:10:00.000Z",
      model: WRITING_MODEL,
      writtenBy: "model",
      facts: writingFacts(playedOut()),
    });
  };

  test("a piece the check refuses is not published, the reason is logged, and the last good one stays up", async () => {
    await lastGood();
    answer = () => answering(UNSOUND);
    const stub = await writer("refused", playedOut, EVENING);

    await runAt(stub, NIGHT);

    expect(await getPieceBySlug(db, `${TODAY}-recap`)).toBeNull();
    expect((await getCurrentPieces(db)).map(({ slug }) => slug)).toEqual(["2031-01-14-recap"]);
    const reasons = [
      'names "Connor", which is not in the facts',
      'names "McDavid", which is not in the facts',
      "uses quotation marks: a piece quotes nobody",
      'attributes words to someone ("said"): a piece quotes nobody',
    ];
    expect(logged()).toContain(
      `Writer: ${TODAY}-recap by ${WRITING_MODEL} failed the check: ${reasons.join("; ")}`,
    );
    expect(logged()).toContain(
      `Writer: ${TODAY}-recap was given up on; the last good piece of its kind stays up`,
    );
    // Each refused try is kept, with why, where no page reads it.
    const kept = await getRejectedPieces(db, `${TODAY}-recap`);
    expect(kept).toHaveLength(3);
    expect(kept[0]).toMatchObject({ status: "rejected", reasons, model: WRITING_MODEL });
  });

  test("a piece gets three tries: the second is told what was wrong, the third is the other model's", async () => {
    answer = ({ model }) => answering(model === WRITING_FALLBACK_MODEL ? SOUND : UNSOUND);
    const stub = await writer("three-tries", playedOut, EVENING);

    await runAt(stub, NIGHT);

    expect(calls.map(({ model }) => model)).toEqual([
      WRITING_MODEL,
      WRITING_MODEL,
      WRITING_FALLBACK_MODEL,
    ]);
    const told = calls.map(
      ({ request }) => JSON.parse(request.messages[1]?.content ?? "{}").lastTry,
    );
    expect(told[0]).toBeUndefined();
    expect(told[1]).toContain('names "McDavid", which is not in the facts');
    expect((await getPieceBySlug(db, `${TODAY}-recap`))?.model).toBe(WRITING_FALLBACK_MODEL);
  });

  test("a model call that throws is logged, stores nothing, and the next piece is still written", async () => {
    answer = ({ options }) => {
      if (JSON.stringify(options).includes("preview")) throw new Error("Workers AI is down");
      return answering(SOUND);
    };
    const stub = await writer("throws");

    await runAt(stub, MORNING);
    await runAt(stub, MORNING + PICKS_WAIT_SECONDS * 1000);

    expect((await getCurrentPieces(db)).map(({ kind }) => kind)).toEqual(["league"]);
    expect(await getRejectedPieces(db, `${TODAY}-preview`)).toEqual([]);
    expect(logged()).toContain(`Writer: ${WRITING_MODEL} failed for ${TODAY}-preview`);
    // The schedules are as they were: tomorrow's run is not lost to tonight's failure.
    expect((await pendingCallbacks(stub)).map(([callback]) => callback).sort()).toEqual([
      "morning",
      "night",
    ]);
  });

  test("an answer that is not a piece stores nothing", async () => {
    answer = () => ({ choices: [{ message: { content: "I cannot write that." } }] });
    const stub = await writer("no-piece", playedOut, EVENING);

    await runAt(stub, NIGHT);

    expect(await getCurrentPieces(db)).toEqual([]);
    expect(await getRejectedPieces(db, `${TODAY}-recap`)).toEqual([]);
    expect(logged()).toContain(`Writer: ${WRITING_MODEL} gave ${TODAY}-recap no piece`);
  });

  test("facts that cannot be read write nothing and leave the schedules standing", async () => {
    const down = () => {
      throw new Error("ESPN is down");
    };
    const stub = await writer("no-facts", down, EVENING);

    await runAt(stub, NIGHT);

    expect(calls).toHaveLength(0);
    expect(logged()).toContain(`Writer: the night pieces for ${TODAY} were not started`);
    expect((await pendingCallbacks(stub)).map(([callback]) => callback).sort()).toEqual([
      "morning",
      "night",
    ]);
  });

  test("the day's model calls are capped, whatever keeps failing", async () => {
    answer = () => answering(UNSOUND);
    const stub = await writer("capped", playedOut, EVENING);

    // The same night's piece, asked for over and over.
    for (let again = 0; again <= WRITING_DAILY_MODEL_CALLS / 3; again++) {
      await runInDurableObject(stub, (instance: WriterAgent) =>
        instance.writeEdition({ edition: "night", date: TODAY, looks: 0 }),
      );
      await runAt(stub, NIGHT + again * 1000);
    }

    expect(calls).toHaveLength(WRITING_DAILY_MODEL_CALLS);
    expect(logged()).toContain(
      "Writer: the day's model calls are spent, and what was waiting is dropped",
    );
  }, 20_000);
});
