import {
  type Game,
  type PredictionOutput,
  type Pregame,
  type PregameSide,
  predictionOutputJsonSchema,
  predictionOutputSchema,
  type RecentGame,
} from "@yogan-hockey/schemas";

/** The model a Prediction is asked of, twice at most (spec section 6). */
export const PRIMARY_MODEL = "@cf/openai/gpt-oss-120b";
/** The model asked once when the first has answered badly twice. */
export const FALLBACK_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
/** The model of each call made for one game, in order. After the last, the game has no Prediction. */
export const MODEL_OF_EACH_CALL = [PRIMARY_MODEL, PRIMARY_MODEL, FALLBACK_MODEL] as const;
/** The AI Gateway every call goes through, for its log of prompts and answers. */
export const AI_GATEWAY_ID = "yogan-hockey";
/** How many model calls the site makes in one day, whatever the slate. */
export const DAILY_MODEL_CALLS = 40;

/**
 * Room for the answer and for the thinking a reasoning model does before it: the binding's
 * default of 256 is spent on thinking, and the answer comes back empty.
 */
const MAX_TOKENS = 3000;

/** One team going into the game, as the model is told it. */
type SideInputs = {
  team: string;
  name: string;
  record: { overall: string | null; home?: string | null; road?: string | null };
  standing: { place: number; division: string; points: number } | null;
  lastFive: { date: string; where: "home" | "away"; opponent: string; result: string }[];
  goalies: {
    name: string;
    gamesPlayed: number | null;
    record: string | null;
    goalsAgainstAverage: number | null;
    savePct: number | null;
  }[];
  injuries: { name: string; position: string | null; status: string; reason: string | null }[];
  leaders: { stat: string; name: string; value: number }[];
};

/**
 * Everything the model is told about a game, and so what a prediction row keeps as its `inputs`.
 * It is built field by field from the pre-game summary, so nothing else ESPN sends can reach the
 * model: betting lines least of all.
 */
export type PredictionInputs = {
  game: { start: string; venue: string | null; kind: string };
  home: SideInputs;
  away: SideInputs;
  seasonSeries: { summary: string; played: string[] } | null;
};

const SEASON_KINDS: Record<number, string> = {
  1: "preseason",
  2: "regular season",
  3: "playoffs",
};

function recentGame(game: RecentGame): SideInputs["lastFive"][number] {
  return {
    date: game.startTime.slice(0, 10),
    where: game.home ? "home" : "away",
    opponent: game.opponent.abbreviation,
    result: `${game.result} ${game.goalsFor}-${game.goalsAgainst}`,
  };
}

function sideInputs(team: Game["home"], side: PregameSide, where: "home" | "road"): SideInputs {
  return {
    team: team.abbreviation,
    name: team.name,
    // The split that applies tonight: the home team's record at home, the visitor's on the road.
    record: { overall: side.record.overall, [where]: side.record[where] },
    standing: side.standing && {
      place: side.standing.position,
      division: side.standing.division,
      points: side.standing.points,
    },
    lastFive: side.lastFive.map(recentGame),
    goalies: side.goalies.map((goalie) => ({
      name: goalie.name,
      gamesPlayed: goalie.gamesPlayed,
      record:
        goalie.wins === null
          ? null
          : `${goalie.wins}-${goalie.losses ?? 0}-${goalie.otLosses ?? 0}`,
      goalsAgainstAverage: goalie.goalsAgainstAverage,
      savePct: goalie.savePct,
    })),
    injuries: side.injuries.map((injury) => ({
      name: injury.name,
      position: injury.position,
      status: injury.status,
      reason: injury.type,
    })),
    leaders: side.leaders.map((leader) => ({
      stat: leader.category,
      name: leader.name,
      value: leader.value,
    })),
  };
}

/** The facts a Prediction is made from (spec section 6), cut down to what the model is told. */
export function predictionInputs(game: Game, pregame: Pregame): PredictionInputs {
  const series = pregame.seasonSeries;
  return {
    game: {
      start: game.startTime,
      venue: game.venue,
      kind: SEASON_KINDS[game.seasonType] ?? "regular season",
    },
    home: sideInputs(game.home, pregame.home, "home"),
    away: sideInputs(game.away, pregame.away, "road"),
    seasonSeries: series && {
      summary: series.summary,
      played: series.games
        .filter((played) => played.status === "final")
        .map(
          ({ startTime, home, away }) =>
            `${startTime.slice(0, 10)}: ${away.abbreviation} ${away.score} at ${home.abbreviation} ${home.score}`,
        ),
    },
  };
}

/** The two teams of a game by abbreviation, home first: the only picks there are. */
export function teamsOf(inputs: PredictionInputs): [string, string] {
  return [inputs.home.team, inputs.away.team];
}

function systemPrompt([home, away]: [string, string]): string {
  return `You make the pre-game pick for a family's hockey site: which team wins an NHL game, and how likely that is. The pick is published once, before the game, labelled "generated by AI, for fun", and is later marked right or wrong against the final score. A good pick is an honest one: the probability says how sure the facts make you, and the reasoning names the facts that decided it.

The user message is the game as JSON: both teams' records, standings, last five games, likely goalies, injuries and scoring leaders, and the games the two have already played against each other this season.

Work only from those facts. Do not add anything you remember about these teams or players: rosters, coaches and form change, and what you remember may be seasons old. If the facts are thin, say less and stay closer to even.

How to read the facts:
- "home" is the home team and "away" the visitor. Home ice is a small edge, a few points of probability and no more.
- Every NHL game has a winner, in overtime or a shootout if it comes to that, so there is no tie to pick.
- NHL games are close. Most honest picks fall between 52 and 68. Go above 75 only when nearly every fact points the same way.
- A record of a few games is a small sample: early in a season lean on it lightly, and note that the last five games can include preseason games then.
- A null or an empty list means the fact is unknown, not zero or none.
- The goalies listed are the ones who may start; the starter is not confirmed.
- A long injury list matters by who is on it: a scoring leader or a starting goalie out is worth more than a depth player.

Never mention betting, odds, lines or wagering in any form. The site has nothing to do with betting.

Answer with one JSON object and nothing else: no preamble, no code fence.
{
  "pick": "${home}" or "${away}",
  "winProbability": a whole number from 50 to 99, the picked team's chance of winning,
  "reasoning": "two or three sentences",
  "keyFactors": ["up to three short phrases"]
}

- "pick" is the abbreviation of the team you expect to win, exactly "${home}" or "${away}".
- "reasoning" is exactly two or three sentences, written for a family of hockey fans reading it before the game: plain words, specific names and numbers from the facts, the one or two things that tipped it. Say what you think, not that you are thinking: no "based on the data", no mention of JSON, a model or an AI, and no advice.
- "keyFactors" are up to three phrases of under ten words each, the most decisive first, each a fact and not a restatement of the pick.`;
}

/** What is sent to the model for one game: the prompt, and the shape its answer must take. */
export function predictionRequest(inputs: PredictionInputs) {
  const teams = teamsOf(inputs);
  return {
    messages: [
      { role: "system", content: systemPrompt(teams) },
      { role: "user", content: JSON.stringify(inputs) },
    ],
    response_format: { type: "json_schema", json_schema: predictionOutputJsonSchema(teams) },
    max_tokens: MAX_TOKENS,
    temperature: 0.4,
  };
}
export type PredictionRequest = ReturnType<typeof predictionRequest>;

/** Finds the model's words in what the binding answered: the two models answer in two shapes. */
function answerOf(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  // The plain Workers AI shape. In JSON mode `response` is already an object.
  if ("response" in raw && raw.response != null) return raw.response;
  // The OpenAI chat shape.
  if ("choices" in raw && Array.isArray(raw.choices)) {
    const [choice] = raw.choices as { message?: { content?: unknown } }[];
    return choice?.message?.content ?? null;
  }
  return raw;
}

/** The JSON object in a model's text, which may be wrapped in a code fence or a sentence. */
function jsonIn(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * The Prediction in what a model answered, or null when it is not one: no JSON, a team that is
 * not playing, a probability out of range, reasoning of the wrong length. Nothing is repaired
 * beyond finding the JSON; an answer either passes the schema or does not count.
 */
export function readModelAnswer(raw: unknown, teams: [string, string]): PredictionOutput | null {
  const answer = answerOf(raw);
  const value = typeof answer === "string" ? jsonIn(answer) : answer;
  const parsed = predictionOutputSchema(teams).safeParse(value);
  return parsed.success ? parsed.data : null;
}
