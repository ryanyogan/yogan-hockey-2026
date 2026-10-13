import { expect, test } from "vitest";
import { checkPiece } from "./check";
import { EDITIONS, LEAGUE, PREVIEW, RECAP, readDraft, writingRequest } from "./kinds";
import { GOOD_PIECE, testFacts } from "./test-facts";

const facts = testFacts();

test("the morning writes the preview and the league note, and the night the recap", () => {
  expect(EDITIONS.morning.map(({ kind }) => kind)).toEqual(["preview", "league"]);
  expect(EDITIONS.night.map(({ kind }) => kind)).toEqual(["recap"]);
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
