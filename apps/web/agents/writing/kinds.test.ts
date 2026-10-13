import { expect, test } from "vitest";
import { COLUMN_KINDS, HOME_KINDS } from "../../lib/piece-copy";
import { checkPiece } from "./check";
import {
  EDITIONS,
  LEAGUE,
  PICKS_MISS,
  PICKS_RUN,
  PICKS_TONIGHT,
  PREVIEW,
  RECAP,
  readDraft,
  systemPrompt,
  writingRequest,
} from "./kinds";
import { GOOD_PIECE, testFacts, testPicksFacts } from "./test-facts";

const facts = testFacts();

test("the morning writes the preview, the league note and then the columns, and the night the recap", () => {
  expect(EDITIONS.morning.map(({ kind }) => kind)).toEqual([
    "preview",
    "league",
    "picks-tonight",
    "picks-miss",
    "picks-run",
  ]);
  expect(EDITIONS.night.map(({ kind }) => kind)).toEqual(["recap"]);
});

test("the kinds written are the kinds the pages read: Home's three and the Picks page's three", () => {
  const written = Object.values(EDITIONS)
    .flat()
    .map(({ kind }) => kind);

  expect(written.toSorted()).toEqual([...HOME_KINDS, ...COLUMN_KINDS].toSorted());
});

const picksFacts = testPicksFacts();

test("Home's pieces are told nothing of the picks' record, with or without it in the facts", () => {
  for (const kind of [RECAP, PREVIEW, LEAGUE]) {
    const given = kind.facts(picksFacts);

    expect(given).not.toBeNull();
    expect(given).not.toHaveProperty("picks");
    expect(given).not.toHaveProperty("picksRecord");
  }
});

test("the column on tonight's game is given the games with a pick, their teams and the record", () => {
  const given = PICKS_TONIGHT.facts(picksFacts);

  expect(given?.slate.map(({ game }) => game)).toEqual(["403"]);
  expect(given?.teams.map(({ team }) => team)).toEqual(["SEA", "VGK"]);
  expect(given?.finals).toEqual([]);
  expect(given?.picksRecord).toEqual({ right: 12, wrong: 9 });
  expect(given?.picks).toMatchObject({ run: { outcome: "right", length: 4 }, best: null });
});

test("on a night with no pick there is no column on tonight's game", () => {
  const unpicked = picksFacts.slate.map((game) => ({ ...game, pick: null }));

  expect(PICKS_TONIGHT.facts({ ...picksFacts, slate: unpicked })).toBeNull();
  expect(PICKS_TONIGHT.facts({ ...picksFacts, slate: [] })).toBeNull();
});

test("the column on the miss is given the week's worst call and its two teams, and no other game", () => {
  const given = PICKS_MISS.facts(picksFacts);

  expect(given?.picks?.worst).toMatchObject({ away: "DAL", home: "BUF", winner: "DAL" });
  expect(given?.picks?.best).toBeNull();
  expect(given?.teams.map(({ team }) => team)).toEqual(["DAL", "BUF"]);
  expect(given?.slate).toEqual([]);
  expect(given?.finals).toEqual([]);
});

test("a week with no miss has no column on one, and nor do facts with no picks' figures", () => {
  const { picks } = picksFacts;

  expect(PICKS_MISS.facts({ ...picksFacts, picks: picks && { ...picks, worst: null } })).toBeNull();
  expect(PICKS_MISS.facts(facts)).toBeNull();
});

test("the column on the record is given the run, the week and the best call", () => {
  const given = PICKS_RUN.facts(picksFacts);

  expect(given?.picks?.run).toEqual({ outcome: "right", length: 4 });
  expect(given?.picks?.week?.days).toHaveLength(3);
  expect(given?.picks?.worst).toBeNull();
  expect(given?.teams.map(({ team }) => team)).toEqual(["SEA", "WSH"]);
});

test("with no pick decided, or the last two picks ending differently, there is no column on a run", () => {
  const { picks } = picksFacts;
  const withRun = (run: NonNullable<typeof picks>["run"]) => ({
    ...picksFacts,
    picks: picks && { ...picks, run },
  });

  expect(PICKS_RUN.facts(withRun(null))).toBeNull();
  expect(PICKS_RUN.facts(withRun({ outcome: "wrong", length: 1 }))).toBeNull();
  expect(PICKS_RUN.facts(withRun({ outcome: "wrong", length: 2 }))).not.toBeNull();
  expect(PICKS_RUN.facts(facts)).toBeNull();
});

test("a column is asked for in a columnist's voice, under the same rules as a piece of Home's", () => {
  const column = systemPrompt(PICKS_MISS);
  const piece = systemPrompt(RECAP);

  expect(column).toContain("columnist");
  expect(piece).not.toContain("columnist");
  for (const rule of ["Quote nobody", "Nothing from memory", "make no forecast of your own"]) {
    expect(column).toContain(rule);
    expect(piece).toContain(rule);
  }
});

/** A column on the miss that says only what `testPicksFacts()` holds. */
const MISS_COLUMN = {
  headline: "Buffalo at 55 percent, and the Stars had other ideas",
  paragraphs: [
    "Our pick on Sunday was Buffalo at 55 percent. The Stars won 4-3. That is the worst call of the week, and it is ours.",
    "The picks went 7-3 from Monday, October 5 to Sunday, October 11, so there is not much else to apologize for. This was the one we were surest of that lost.",
    "The season stands at 12-9. One miss does not change that much, and we will not pretend it was close to being right.",
  ],
};
const missFacts = PICKS_MISS.facts(picksFacts) as NonNullable<ReturnType<typeof PICKS_MISS.facts>>;
const runFacts = PICKS_RUN.facts(picksFacts) as NonNullable<ReturnType<typeof PICKS_RUN.facts>>;
const columnWith = (paragraph: string) => ({
  ...MISS_COLUMN,
  paragraphs: [...MISS_COLUMN.paragraphs, paragraph],
});

test("a column that says only what its facts hold passes the check", () => {
  expect(checkPiece(MISS_COLUMN, missFacts)).toEqual([]);
  expect(
    checkPiece(
      {
        headline: "The picks have 4 right in a row",
        paragraphs: [
          "The picks have 4 right in a row and went 7-3 for the week. The best of them was Seattle at 58 percent on Sunday, when the Kraken beat the Capitals 5-3.",
          "Saturday was the busiest day at 3-1. The season is 12-9, which is the figure that counts.",
        ],
      },
      runFacts,
    ),
  ).toEqual([]);
});

test("a sentence about the picks' count is not read as one about the pick beside it", () => {
  const sentences = [
    "The picks had been right 7 times this week before the Sabres.",
    "Our pick was the Sabres at 55 percent. The picks were still right more often than not.",
    "The picks have won 4 in a row, and the Sabres were not among them.",
  ];

  for (const sentence of sentences) expect(checkPiece(columnWith(sentence), missFacts)).toEqual([]);
});

test.each([
  ["the pick turned round", "Our pick was Dallas at 55 percent.", "says the pick is Dallas"],
  ["a count the facts do not hold", "The picks went 8-2 this week.", "gives a score of 8-2"],
  ["a score that was not the game's", "The Stars won 5-1.", "gives a score of 5-1"],
  ["a winner that was not", "The Sabres beat the Stars.", "no final in the facts has that result"],
  ["a miss called a hit", "The pick on Buffalo was right.", "says a pick was right"],
  ["a run that is not the picks'", "The picks have 5 right in a row.", "gives a run of the picks"],
  [
    "a day's count as the game's score",
    "The Stars beat the Sabres 3-1 on Sunday.",
    "gives a score of 3-1",
  ],
  ["the season's count as the week's", "The picks went 12-9 this week.", "gives a score of 12-9"],
  [
    "a run that went the other way",
    "The picks have missed 4 in a row.",
    "gives a run of the picks",
  ],
  [
    "a run with no word for the picks",
    "We have been right 9 straight.",
    "gives a run of the picks",
  ],
  [
    "a run beside a team",
    "The picks have 5 right in a row, the Sabres among them.",
    "gives a run of the picks",
  ],
  [
    "a team's streak passed off as the picks'",
    "Our pick was the Sabres, who have won 4 in a row.",
    "which is not the named team's",
  ],
  ["a quote", "Buffalo said it “was not our night”.", "a piece quotes nobody"],
  ["a game it was not given", "The Kraken beat the Capitals 5-3.", "which is not in the facts"],
  ["a forecast of its own", "The Stars will win again.", "says the pick is"],
])("a column on the miss with %s fails the check", (_what, sentence, reason) => {
  expect(checkPiece(columnWith(sentence), missFacts).join("; ")).toContain(reason);
});

test("the recap is given the finals and their teams, and no game still to be played", () => {
  const given = RECAP.facts(facts);

  expect(given?.finals).toEqual(facts.finals);
  expect(given?.slate).toEqual([]);
  expect(given?.teams.map(({ team }) => team)).toEqual(["SEA", "WSH", "DAL", "BUF"]);
  expect(RECAP.facts({ ...facts, finals: [] })).toBeNull();
});

test("the preview is given the slate and its teams, and no finished game", () => {
  const given = PREVIEW.facts(facts);

  expect(given?.slate).toEqual(facts.slate);
  expect(given?.finals).toEqual([]);
  expect(given?.teams.map(({ team }) => team)).toEqual(["SEA", "DAL", "VGK", "VAN"]);
  expect(PREVIEW.facts({ ...facts, slate: [] })).toBeNull();
});

test("the league note is given every club, the results without their scorers or picks, and no slate", () => {
  const given = LEAGUE.facts(facts);

  expect(given?.teams).toHaveLength(6);
  expect(given?.slate).toEqual([]);
  expect(given?.finals.map(({ goals, pick }) => [goals, pick])).toEqual([
    [null, null],
    [null, null],
  ]);
});

test("there is no league note without the standings, or before anyone has a point", () => {
  const names = facts.teams.map(({ team, name, city, nickname, record }) => ({
    team,
    name,
    city,
    nickname,
    record,
  }));
  expect(LEAGUE.facts({ ...facts, teams: names })).toBeNull();
  const pointless = facts.teams.map((team) => ({ ...team, points: 0 }));
  expect(LEAGUE.facts({ ...facts, teams: pointless })).toBeNull();
});

test("a piece is checked against what its kind was given: the recap may not name tonight's visitor", () => {
  const recap = RECAP.facts(facts);
  if (!recap) throw new Error("The recap has facts");
  const piece = {
    ...GOOD_PIECE,
    paragraphs: [...GOOD_PIECE.paragraphs, "The Golden Knights are next."],
  };

  expect(checkPiece(GOOD_PIECE, recap)).toEqual([]);
  expect(checkPiece(piece, facts)).toEqual([]);
  expect(checkPiece(piece, recap)).toEqual([
    'names "Golden", which is not in the facts',
    'names "Knights", which is not in the facts',
  ]);
});

test("the model is sent the rules, the brief and the facts, and asked for the draft's shape", () => {
  const request = writingRequest(PREVIEW, facts);

  const [system, user] = request.messages;
  expect(system?.role).toBe("system");
  for (const rule of [
    "Quote nobody",
    "Nothing from memory",
    "injuries",
    "make no forecast of your own",
  ]) {
    expect(system?.content).toContain(rule);
  }
  expect(JSON.parse(user?.content ?? "")).toEqual({ write: PREVIEW.brief, facts });
  expect(request.response_format.json_schema.required).toEqual(["headline", "paragraphs"]);
});

test("a second try is told why the first was thrown away", () => {
  const request = writingRequest(PREVIEW, facts, ['names "McDavid", which is not in the facts']);

  expect(JSON.parse(request.messages[1]?.content ?? "").lastTry).toBe(
    'Your last piece was thrown away because it names "McDavid", which is not in the facts. Write it again without that.',
  );
});

test("a draft is read from either shape a model answers in, fenced or not", () => {
  const text = JSON.stringify(GOOD_PIECE);

  expect(readDraft({ choices: [{ message: { content: text } }] })).toEqual(GOOD_PIECE);
  expect(readDraft({ response: GOOD_PIECE })).toEqual(GOOD_PIECE);
  expect(readDraft({ response: `Here it is:\n\`\`\`json\n${text}\n\`\`\`` })).toEqual(GOOD_PIECE);
});

const long = GOOD_PIECE.paragraphs.join(" ").repeat(4);

test.each([
  ["no JSON", "I cannot write that."],
  ["no headline", { paragraphs: GOOD_PIECE.paragraphs }],
  ["one paragraph", { headline: "Kraken win", paragraphs: [GOOD_PIECE.paragraphs.join(" ")] }],
  ["a few words", { headline: "Kraken win", paragraphs: ["They won.", "It was close."] }],
  [
    "an essay",
    {
      headline: "Kraken win",
      paragraphs: [long, long],
    },
  ],
  ["a headline that is a sentence", { ...GOOD_PIECE, headline: "The Kraken won." }],
  [
    "a paragraph with a break in it",
    { ...GOOD_PIECE, paragraphs: ["One.\nTwo.", ...GOOD_PIECE.paragraphs] },
  ],
])("an answer with %s is not a draft", (_what, answer) => {
  expect(readDraft({ response: answer })).toBeNull();
});
