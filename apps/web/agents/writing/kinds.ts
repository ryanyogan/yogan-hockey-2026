import {
  type FactCall,
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
/**
 * The most model calls the writer makes in one day, whatever goes wrong: every try of every
 * piece, so that nothing a column spends can leave a piece of Home's unwritten. A day when every
 * piece passes at its first try is one call a piece: six.
 */
export const WRITING_DAILY_MODEL_CALLS = 18;

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
  /** The voice it is written in. Left out, it is the front page's (`AGATE_VOICE`). */
  voice?: string;
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

/** Home's pieces are told nothing of the picks' record: that is the Picks page's columns'. */
function withoutPicks(facts: WritingFacts): WritingFacts {
  const { picks: _picks, picksRecord: _picksRecord, ...rest } = facts;
  return rest;
}

/** The night's finished games, written after the last final. */
export const RECAP: PieceKind = {
  kind: "recap",
  brief:
    "A roundup of the finished games in `finals`: who won, by what score, and who scored. Lead with the game or the player that stands out (the most goals, a game decided in overtime or a shootout, the widest margin), then go around the rest in a sentence or two each. Where a final has a `pick`, you may say in one clause whether the site's pick was right or wrong. Do not mention any game still to be played.",
  facts: (all) =>
    all.finals.length === 0 ? null : withTeamsOf({ ...withoutPicks(all), slate: [] }),
};

/** Tonight's games and the site's picks for them, written before the slate. */
export const PREVIEW: PieceKind = {
  kind: "preview",
  brief:
    "A look ahead at the games in `slate`: who visits whom and when, what each side's record and streak say, and the site's pick where `pick` is given (the team and its chance, exactly as given). Lead with the game the facts make most interesting (two strong records, a long streak on the line, the closest pick). A game whose `pick` is null gets no pick from you. Do not write about finished games.",
  facts: (all) =>
    all.slate.length === 0
      ? null
      : withTeamsOf({ ...withoutPicks(all), finals: [], finalsDay: null }),
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
    return { ...withoutPicks(all), teams: placed, finals, slate: [] };
  },
};

/**
 * The voice of the Picks page's columns (#218): a columnist's, where Home's pieces are a wire
 * report's. Only the voice is looser. The rules above it in the prompt are the same ones, and
 * the check reads a column exactly as it reads a recap.
 */
const COLUMN_VOICE = `The voice is a newspaper sports columnist's, writing about this site's own picks: someone with an opinion about how the picks are doing, who would rather be wry than loud.
- The picks are "the picks" or "our picks", and the column may say "we" for the site that made them. Own a miss plainly and do not crow over a hit: the record does the crowing.
- Have a point of view about what the figures show (a pick that was too sure, a run that is shorter than it sounds, a game that will test the record), and say it once. Every opinion is about the picks and what the facts hold. None is about what a team or a player is like beyond its record and streak.
- Short sentences, dry humour, no exclamation marks and no rhetorical questions. No hype words: not "thrilling", "dominant", "statement", "all eyes".
- A nickname takes a plural verb ("the Kraken win"); a city takes a singular one ("Seattle leads").
- A count of right and wrong picks is written right-wrong with a hyphen, as the facts give it: "7-3 this week". Do not turn it into a percentage or a fraction.
- An opinion is not a forecast. The only forecast is the site's pick, at its own percentage; the column never says who will or should win.
- Do not mention JSON, facts, data, a model or an AI, and do not address the reader.
- Use full team names or nicknames, never the abbreviations.`;

/** What the columns are told about the figures every one of them is given. */
const PICKS_FIGURES =
  "`picksRecord` is the season's count of the site's picks, right and wrong. `picks.week` is the same count for one Monday-to-Sunday week (`from` and `to` are its first and last days) and for each day of it, and `picks.run` is how many of the latest picks in a row ended the same way.";

/** A column's part of the facts: the season's record, the week and the run, with nothing else. */
function columnFacts(all: WritingFacts): WritingFacts {
  return { ...all, teams: [], finals: [], finalsDay: null, slate: [], people: undefined };
}

/** A call as the check and the model read a finished game. */
const callFinals = (calls: (FactCall | null)[]): FactCall[] => calls.filter((call) => call != null);

/** The teams of some games, as the facts hold them. */
const teamsOf = (all: WritingFacts, games: { away: string; home: string }[]) => {
  const playing = new Set(games.flatMap(({ away, home }) => [away, home]));
  return all.teams.filter(({ team }) => playing.has(team));
};

/** The game to watch tonight, of those the site has a pick for. Not written on a night with no pick. */
export const PICKS_TONIGHT: PieceKind = {
  kind: "picks-tonight",
  brief: `A column on the one game in \`slate\` that tonight's picks have most riding on. Choose it from the facts: the pick the site is surest of, or the one it is least sure of, or the one against a club on a long streak. Say which game it is and when it starts, state the pick exactly as given (that team, that percentage), and say what in the two records and streaks makes it the game to watch. You may set it against how the picks have been doing. ${PICKS_FIGURES} Mention the other games only in passing, and none of their picks unless as given.`,
  voice: COLUMN_VOICE,
  facts: (all) => {
    const slate = all.slate.filter(({ pick }) => pick !== null);
    if (slate.length === 0) return null;
    const picks = all.picks && { ...all.picks, best: null, worst: null };
    return { ...columnFacts(all), slate, teams: teamsOf(all, slate), picks };
  },
};

/** The call that looked foolish: the week's firmest pick that lost. Not written in a week with no miss. */
export const PICKS_MISS: PieceKind = {
  kind: "picks-miss",
  brief: `A column on the week's worst call, which is \`picks.worst\`: the pick the site was surest of that lost. Say who was picked and at what percentage, who won instead and by what score, and on which day. Then say how the miss sits in the week: ${PICKS_FIGURES} Own the miss; do not explain it away, and do not guess at why the game went as it did, since you know only its score. You do not know who scored or whether it went to overtime.`,
  voice: COLUMN_VOICE,
  facts: (all) => {
    const worst = all.picks?.worst;
    if (!all.picks || !worst) return null;
    return {
      ...columnFacts(all),
      teams: teamsOf(all, [worst]),
      picks: { ...all.picks, best: null },
    };
  },
};

/** A run is at least this many picks in a row that ended the same way. */
export const SHORTEST_RUN = 2;

/** The record and its run. Not written before a pick is decided, nor when the last two picks differ. */
export const PICKS_RUN: PieceKind = {
  kind: "picks-run",
  brief: `A column on the picks' record and the run they are on. ${PICKS_FIGURES} Lead with the run (so many right in a row, or so many wrong), then say what the week and the season look like around it, day by day where that tells something. Where \`picks.best\` is given it is the week's best call, the pick the site was surest of that came in: you may name it, with its percentage, its score and its day. You know nothing of the games but their scores.`,
  voice: COLUMN_VOICE,
  facts: (all) => {
    const { picks, picksRecord } = all;
    if (!picks?.run || !picksRecord || picks.run.length < SHORTEST_RUN) return null;
    return {
      ...columnFacts(all),
      teams: teamsOf(all, callFinals([picks.best])),
      picks: { ...picks, worst: null },
    };
  },
};

/**
 * What is written before the slate, and what is written after the last final. The order is the
 * order they are written in: Home's pieces first, then the Picks page's columns, so a column
 * that keeps failing is tried after the preview and the league note are settled.
 */
export const EDITIONS = {
  morning: [PREVIEW, LEAGUE, PICKS_TONIGHT, PICKS_MISS, PICKS_RUN],
  night: [RECAP],
} as const satisfies Record<string, readonly PieceKind[]>;
export type Edition = keyof typeof EDITIONS;

const RULES = `You write short pieces for a family's hockey site, which is set like a newspaper's sports page. Each piece is published under a line saying a model wrote it, and before that it is checked by a program, word by word, against the facts you were given. A piece with one name or one number the facts do not hold is thrown away.

The user message is JSON: "write" says what this piece is, and "facts" is everything you know. Teams appear in games by abbreviation; "teams" gives each one's city and nickname, its record (wins-losses-overtime losses), points, place in its division and streak.

The facts are the whole world:
- Name only teams and players that are in the facts, spelled as they are there. A player is named in full the first time.
- Every number you write is one you can point to in the facts: a final score, a record, a points total, a pick's percentage, a start time. Do no arithmetic beyond counting goals and subtracting points. Write numbers as numerals.
- A score is a final score, the winner's first, or the score after a goal listed in the facts.
- Nothing from memory. You do not know these teams' rosters, coaches, histories, arenas or last season. If it is not in the facts, it did not happen.
- Nothing about injuries, illness, trades, signings, contracts, suspensions, coaches, rumours or reports. Never betting, odds, lines or wagering in any form.
- Quote nobody. No quotation marks at all, and nobody "said" anything.
- The site's picks are in the facts as "pick". A count of how the picks have done is given only where the facts hold one ("picksRecord", "picks"): write it as given, right-wrong. Call it "the pick" or "our pick". State a pick only as given: that team, that percentage. Never say or imply that the other team is favored, and make no forecast of your own: no "will win", no "should win". Where "pick" is null, the site has no pick and neither do you.`;

/** The voice of Home's pieces. */
const AGATE_VOICE = `The voice is a newspaper's agate page: plain, dry, exact.
- Short declarative sentences in the past tense for what happened and the present for what stands. No exclamation marks, no questions, no "we" except "our pick".
- A nickname takes a plural verb ("the Kraken win", "the Wild fall"); a city takes a singular one ("Seattle leads").
- No hype and no filler: not "thrilling", "dominant", "statement win", "all eyes", "looks to". Let the number carry it: "The Kraken have won 4 in a row."
- Do not mention JSON, facts, data, a model or an AI, and do not address the reader.
- Use full team names or nicknames, never the abbreviations.`;

const ANSWER = `Answer with one JSON object and nothing else: no preamble, no code fence.
{
  "headline": "one line in sentence case, under 80 characters, no full stop: only the first word and names are capitalized",
  "paragraphs": ["two to four paragraphs", "each two to four sentences", "120 to 200 words in all"]
}`;

/** The whole of what a kind's model is told before its facts: the rules, its voice, the answer's shape. */
export const systemPrompt = (kind: PieceKind): string =>
  [RULES, kind.voice ?? AGATE_VOICE, ANSWER].join("\n\n");

/** What is sent to the model for one piece: the prompt, the brief, the facts, the answer's shape. */
export function writingRequest(kind: PieceKind, facts: WritingFacts, refused: string[] = []) {
  const ask: Record<string, unknown> = { write: kind.brief, facts };
  // A second try is told what the check found in the first.
  if (refused.length > 0) {
    ask.lastTry = `Your last piece was thrown away because it ${refused.join("; it ")}. Write it again without that.`;
  }
  return {
    messages: [
      { role: "system", content: systemPrompt(kind) },
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
