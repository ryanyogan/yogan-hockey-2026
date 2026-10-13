import {
  type PieceDraft,
  PieceDraftSchema,
  pieceDraftJsonSchema,
  type WritingFacts,
} from "@yogan-hockey/schemas";
import { jsonAnswer } from "../model-answer";

/** The model a piece is asked of, twice at most: the one that makes the Predictions. */
export const WRITING_MODEL = "@cf/openai/gpt-oss-120b";
/** The model asked once when the first has twice written a piece the check refused. */
export const WRITING_FALLBACK_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
/** The model of each call made for one piece, in order. After the last, the piece is not written. */
export const WRITING_MODEL_OF_EACH_CALL = [
  WRITING_MODEL,
  WRITING_MODEL,
  WRITING_FALLBACK_MODEL,
] as const;
/** The most model calls the writer makes in one day, whatever goes wrong. */
export const WRITING_DAILY_MODEL_CALLS = 12;

/** Room for the piece and for the thinking a reasoning model does before it. */
const MAX_TOKENS = 4000;

/**
 * A kind of piece: what it is about, and which of the facts it is given. A piece is checked
 * against the facts it was given and no others, so a kind that is told less can say less. The
 * Picks page's columns (#218) are more of these.
 */
export type PieceKind = {
  /** The kind's name, which is in the piece's slug: "recap". */
  kind: string;
  /** What the model is told to write, in a paragraph. */
  brief: string;
  /** The part of the facts this kind is given, or null when there is not enough to write from. */
  facts(all: WritingFacts): WritingFacts | null;
};

/** The facts with only the teams that play in the games kept. */
function withTeamsOf(facts: WritingFacts): WritingFacts {
  const playing = new Set(
    [...facts.finals, ...facts.slate].flatMap(({ away, home }) => [away, home]),
  );
  return { ...facts, teams: facts.teams.filter(({ team }) => playing.has(team)) };
}

/** The night's finished games, written after the last final. */
export const RECAP: PieceKind = {
  kind: "recap",
  brief:
    "A roundup of the finished games in `finals`: who won, by what score, and who scored. Lead with the game or the player that stands out (the most goals, a game decided in overtime or a shootout, the widest margin), then go around the rest in a sentence or two each. Where a final has a `pick`, you may say in one clause whether the site's pick was right or wrong. Do not mention any game still to be played.",
  facts: (all) => (all.finals.length === 0 ? null : withTeamsOf({ ...all, slate: [] })),
};

/** Tonight's games and the site's picks for them, written before the slate. */
export const PREVIEW: PieceKind = {
  kind: "preview",
  brief:
    "A look ahead at the games in `slate`: who visits whom and when, what each side's record and streak say, and the site's pick where `pick` is given (the team and its chance, exactly as given). Lead with the game the facts make most interesting (two strong records, a long streak on the line, the closest pick). A game whose `pick` is null gets no pick from you. Do not write about finished games.",
  facts: (all) =>
    all.slate.length === 0 ? null : withTeamsOf({ ...all, finals: [], finalsDay: null }),
};

/** Where the league stands: the standings and the streaks, written before the slate. */
export const LEAGUE: PieceKind = {
  kind: "league",
  brief:
    "A note on where the league stands, from `teams`: who leads each division or conference and by how many points, the longest winning and losing streaks, a club whose home or road record stands out. The `finals` are the most recent results and may be used to say how a club got where it is. Pick two or three threads; do not list every club. Make no picks and name no game still to be played.",
  facts: (all) => {
    const placed = all.teams.filter((team) => team.points !== undefined);
    if (placed.length === 0 || placed.every((team) => team.points === 0)) return null;
    const finals = all.finals.map((final) => ({ ...final, goals: null, pick: null }));
    return { ...all, teams: placed, finals, slate: [] };
  },
};

/** What is written before the slate, and what is written after the last final. */
export const EDITIONS = {
  morning: [PREVIEW, LEAGUE],
  night: [RECAP],
} as const satisfies Record<string, readonly PieceKind[]>;
export type Edition = keyof typeof EDITIONS;

const SYSTEM_PROMPT = `You write short pieces for the front page of a family's hockey site, which is set like a newspaper's sports page. Each piece is published under a line saying a model wrote it, and before that it is checked by a program, word by word, against the facts you were given. A piece with one name or one number the facts do not hold is thrown away.

The user message is JSON: "write" says what this piece is, and "facts" is everything you know. Teams appear in games by abbreviation; "teams" gives each one's city and nickname, its record (wins-losses-overtime losses), points, place in its division and streak.

The facts are the whole world:
- Name only teams and players that are in the facts, spelled as they are there. A player is named in full the first time.
- Every number you write is one you can point to in the facts: a final score, a record, a points total, a pick's percentage, a start time. Do no arithmetic beyond counting goals and subtracting points. Write numbers as numerals.
- A score is a final score, the winner's first, or the score after a goal listed in the facts.
- Nothing from memory. You do not know these teams' rosters, coaches, histories, arenas or last season. If it is not in the facts, it did not happen.
- Nothing about injuries, illness, trades, signings, contracts, suspensions, coaches, rumours or reports. Never betting, odds, lines or wagering in any form.
- Quote nobody. No quotation marks at all, and nobody "said" anything.
- The site's picks are in the facts as "pick". Call it "the pick" or "our pick". State a pick only as given: that team, that percentage. Never say or imply that the other team is favored, and make no forecast of your own: no "will win", no "should win". Where "pick" is null, the site has no pick and neither do you.

The voice is a newspaper's agate page: plain, dry, exact.
- Short declarative sentences in the past tense for what happened and the present for what stands. No exclamation marks, no questions, no "we" except "our pick".
- A nickname takes a plural verb ("the Kraken win", "the Wild fall"); a city takes a singular one ("Seattle leads").
- No hype and no filler: not "thrilling", "dominant", "statement win", "all eyes", "looks to". Let the number carry it: "The Kraken have won 4 in a row."
- Do not mention JSON, facts, data, a model or an AI, and do not address the reader.
- Use full team names or nicknames, never the abbreviations.

Answer with one JSON object and nothing else: no preamble, no code fence.
{
  "headline": "one line in sentence case, under 80 characters, no full stop: only the first word and names are capitalized",
  "paragraphs": ["two to four paragraphs", "each two to four sentences", "120 to 200 words in all"]
}`;

/** What is sent to the model for one piece: the prompt, the brief, the facts, the answer's shape. */
export function writingRequest(kind: PieceKind, facts: WritingFacts, refused: string[] = []) {
  const ask: Record<string, unknown> = { write: kind.brief, facts };
  // A second try is told what the check found in the first.
  if (refused.length > 0) {
    ask.lastTry = `Your last piece was thrown away because it ${refused.join("; it ")}. Write it again without that.`;
  }
  return {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(ask) },
    ],
    response_format: { type: "json_schema", json_schema: pieceDraftJsonSchema },
    max_tokens: MAX_TOKENS,
    // The binding's default: a piece should not read the same every night.
    temperature: 0.6,
  };
}
/** The body of one model call. Both models are sent the same one. */
export type WritingRequest = ReturnType<typeof writingRequest>;

/**
 * The draft in what a model answered, or null when there is none: no JSON, no headline, too few
 * paragraphs, too many words. A draft is not yet a piece: `checkPiece` reads it next.
 */
export function readDraft(raw: unknown): PieceDraft | null {
  const parsed = PieceDraftSchema.safeParse(jsonAnswer(raw));
  return parsed.success ? parsed.data : null;
}
