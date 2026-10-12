import {
  pickOutcome,
  type ScoreboardGame,
  type ScoreboardSide,
  type SeasonRecord,
  type SlatePick,
} from "@yogan-hockey/schemas";
import { tonightGames } from "./dashboard";
import { gameTime, slateDate } from "./game-time";
import { pickedSide } from "./picks";
import { betweenPeriods, gameStatusLine, periodLabel, slateCounts } from "./scoreboard-view";

/*
 * Every sentence the Agate look prints, as pure functions of a game, its Prediction and the
 * season's record: the port of `prototypes/agate/copy.js`. Nothing here invents a fact: each word
 * comes from the score, the status, the records or the pick. Nothing touches the server, so
 * client components use it.
 *
 * A time is written in the zone it is given, and in the zone of whatever runs the code when it is
 * given none (`lib/game-time.ts`): the server passes the NHL's, the browser the visitor's own.
 */

/**
 * A Prediction as a page has it: the row, or the little of it a slate carries to the browser, or
 * nothing where a game has none.
 */
type Prediction = SlatePick | null | undefined;
/** What naming a club takes. A standings row's team has it too. */
type Named = Pick<ScoreboardSide, "abbreviation" | "location" | "shortName">;

/** The clubs that share a location, by abbreviation: agate type has to tell them apart. */
const AGATE_NAMES: Record<string, string> = {
  NYI: "N.Y. Islanders",
  NYR: "N.Y. Rangers",
};

/**
 * The name in agate type: the location ("Seattle"), or "N.Y. Rangers" where two clubs share one.
 * The abbreviation for a side stored before the Scoreboard carried the names.
 */
export const agateName = (team: Pick<Named, "abbreviation" | "location">): string =>
  AGATE_NAMES[team.abbreviation] ?? team.location ?? team.abbreviation;

/**
 * The nickname a headline uses: "Kraken", "Maple Leafs". The abbreviation for a side stored before
 * the Scoreboard carried the names.
 */
export const nickname = (team: Pick<Named, "abbreviation" | "shortName">): string =>
  team.shortName ?? team.abbreviation;

const WORD_JOINER = "⁠";

/** A record that never breaks across lines: word joiners around its hyphens. */
export const rec = (record: string): string =>
  record.replaceAll("-", `${WORD_JOINER}-${WORD_JOINER}`);

/** A side's shots over the ice: "27 shots", "1 shot". */
export const shotsOnGoal = (shots: number): string => `${shots} ${shots === 1 ? "shot" : "shots"}`;

const capitalized = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** The side ahead and the side behind. Level, which no final is, the home side is put first. */
function sides(game: ScoreboardGame): [ahead: ScoreboardSide, behind: ScoreboardSide] {
  return game.away.score > game.home.score ? [game.away, game.home] : [game.home, game.away];
}

/** A game ESPN calls live from the warm-up: it has no period yet, so it reads as one to come. */
export const underWay = (game: ScoreboardGame) =>
  game.status === "live" && periodLabel(game) !== "";

/**
 * The headline.
 *   final      winner first, nicknames: "Kraken 5, Capitals 3"
 *   live       away then home, as the line score reads: "Mammoth 2, Devils 2"
 *   scheduled  "Golden Knights at Kraken"; a postponed game the same
 */
export function headline(game: ScoreboardGame): string {
  return gameLine(game, nickname);
}

/** The game in a brief: "Montreal 3, Carolina 2", "Utah 2, New Jersey 2", "Vegas at Seattle". */
export function briefGame(game: ScoreboardGame): string {
  return gameLine(game, agateName);
}

function gameLine(game: ScoreboardGame, name: (side: ScoreboardSide) => string): string {
  const { away, home } = game;
  if (game.status === "final") {
    const [winner, loser] = sides(game);
    return `${name(winner)} ${winner.score}, ${name(loser)} ${loser.score}`;
  }
  if (underWay(game)) return `${name(away)} ${away.score}, ${name(home)} ${home.score}`;
  return `${name(away)} at ${name(home)}`;
}

/**
 * A game's status as a brief says it, and as a kicker begins: "Final/OT", "Live · 3rd 18:44",
 * "Live · End 2nd", "8:40 PM", "Postponed" (in ESPN's own word, so also "Canceled").
 *
 * `zoneMark` follows a start time and nothing else: " ET" where the server writes the NHL's time
 * for a visitor whose own it cannot know, as `LocalTime` does.
 */
export function statusText(game: ScoreboardGame, timeZone?: string, zoneMark = ""): string {
  const line = gameStatusLine(game);
  if (line == null) return `${gameTime(game.startTime, timeZone)}${zoneMark}`;
  if (game.status !== "live") return capitalized(line);
  return underWay(game) ? `Live · ${capitalized(line)}` : "Live";
}

/** The red line above the headline: status · venue. */
export function kicker(game: ScoreboardGame, timeZone?: string, zoneMark = ""): string {
  const status = statusText(game, timeZone, zoneMark);
  return game.venue ? `${status} · ${game.venue}` : status;
}

/** "the 3rd", "overtime" (however many of them a playoff game has played), "the shootout". */
function periodPhrase(label: string): string {
  if (label === "SO") return "the shootout";
  return label.endsWith("OT") ? "overtime" : `the ${label}`;
}

const withRecord = (side: ScoreboardSide) =>
  side.record == null ? nickname(side) : `${nickname(side)} (${rec(side.record)})`;

/** "The Golden Knights (2-1-0) visit the Kraken (2-1-0)." */
const matchup = ({ away, home }: ScoreboardGame) =>
  `The ${withRecord(away)} visit the ${withRecord(home)}.`;

function finalDeck(game: ScoreboardGame): string {
  const [winner, loser] = sides(game);
  const where = winner === game.home ? "at home" : "on the road";
  const label = periodLabel(game);
  const extra = label === "SO" ? " in a shootout" : label.endsWith("OT") ? " in overtime" : "";
  const moved = winner.record == null ? "" : ` and move to ${rec(winner.record)}`;
  const won = `The ${nickname(winner)} win ${where}${extra}${moved}.`;
  return loser.record == null ? won : `${won} The ${nickname(loser)} fall to ${rec(loser.record)}.`;
}

function liveDeck(game: ScoreboardGame): string {
  const { away, home } = game;
  const phrase = periodPhrase(periodLabel(game));
  const between = betweenPeriods(game);
  const when = `${between ? "after" : "in"} ${phrase}`;
  if (away.score === home.score) {
    return phrase === "overtime" && !between
      ? "Tied in overtime."
      : `Tied ${away.score}–${home.score} ${when}.`;
  }
  const [leader, trailer] = sides(game);
  return `The ${nickname(leader)} lead by ${leader.score - trailer.score} ${when}.`;
}

/**
 * The deck: one or two plain sentences under the headline.
 *   final      "The Kraken win on the road and move to 4-2-0. The Capitals fall to 3-2-0.", with
 *              " in overtime" or " in a shootout" after "win at home".
 *   live       "The Rangers lead by 1 in the 3rd." / "Tied 2–2 in the 3rd." / "Tied in overtime."
 *              "after the 2nd" in an intermission.
 *   scheduled  "The Golden Knights (2-1-0) visit the Kraken (2-1-0)."
 *   postponed  "Postponed.", in ESPN's own word.
 * Nicknames take a plural verb ("the Wild win", "the Lightning fall"), so one form fits all 32.
 * A record ESPN did not send is left out, with the words that led up to it.
 */
export function deck(game: ScoreboardGame): string {
  if (game.status === "final") return finalDeck(game);
  if (game.status === "postponed") return `${statusText(game)}.`;
  return underWay(game) ? liveDeck(game) : matchup(game);
}

/** The picked team's chance as the site prints it: a whole percentage. */
const chance = (winProbability: number) => `${Math.round(winProbability)}%`;

/**
 * "Our pick: Washington, 63%." The site's word is "pick" (GLOSSARY.md), never odds. Null for a
 * failed or missing Prediction, which is nothing shown.
 */
export function pickSentence(prediction: Prediction, game: ScoreboardGame): string | null {
  const side = pickedSide(prediction, game);
  if (prediction?.status !== "made" || side == null) return null;
  return `Our pick: ${agateName(side)}, ${chance(prediction.winProbability)}.`;
}

/** A brief's pick: "SEA 59%". Null for a failed or missing Prediction: the brief says "No pick". */
export function briefPick(prediction: Prediction, game: ScoreboardGame): string | null {
  const side = pickedSide(prediction, game);
  if (prediction?.status !== "made" || side == null) return null;
  return `${side.abbreviation} ${chance(prediction.winProbability)}`;
}

/**
 * Right or wrong once a picked game is final; null before then, or with no pick. It is
 * `pickOutcome` (`packages/schemas`), kept from marking a live game's score.
 */
export function gamePickOutcome(
  prediction: Prediction,
  game: ScoreboardGame,
): "right" | "wrong" | null {
  if (game.status !== "final" || pickedSide(prediction, game) == null) return null;
  return pickOutcome(prediction ?? null, game);
}

/**
 * What the roundup says with no game to lead with. Without a date the Scoreboard has not
 * answered, which is not a day off.
 */
export const noGames = (date: string | null): string =>
  date == null
    ? "Today's games could not be read. They appear here as soon as they can be."
    : "No games scheduled today.";

/** What Home's standings say with no table to draw: ESPN did not answer, or the season is new. */
export const noStandings = (read: boolean): string =>
  read ? "No standings yet this season." : "The standings could not be read just now.";

/** How many games a slate leads with. */
export const MAX_LEADS = 3;

/** What matters most right now comes first. */
const LEAD_RANK = { live: 0, scheduled: 1, final: 2, postponed: 3 } as const satisfies Record<
  ScoreboardGame["status"],
  number
>;

/**
 * Leads and briefs. Up to three games are drawn as full stories ("leads"); every other game is a
 * one-line brief in the agate "Around the league" table. Leads are chosen by what matters right
 * now (live games, then the next to start, then the latest finals) and each list is in the
 * slate's own stable order (`tonightGames`, docs/design/stable-game-order), whatever order the
 * games are handed in, so nothing reshuffles while a game is being watched: a game only moves
 * between the lists, and only when a status changes.
 */
export function leadsAndBriefs(
  games: readonly ScoreboardGame[],
  max: number = MAX_LEADS,
): { leads: ScoreboardGame[]; briefs: ScoreboardGame[] } {
  const slate = tonightGames(games);
  // The sort is stable, so each status keeps the slate's order: the earliest first. The finals
  // are turned round beforehand, which puts the latest of them first.
  const finalsLatestFirst = [
    ...slate.filter((game) => game.status !== "final"),
    ...slate.filter((game) => game.status === "final").toReversed(),
  ];
  const chosen = new Set(
    finalsLatestFirst
      .toSorted((a, b) => LEAD_RANK[a.status] - LEAD_RANK[b.status])
      .slice(0, max)
      .map((game) => game.id),
  );
  return {
    leads: slate.filter((game) => chosen.has(game.id)),
    briefs: slate.filter((game) => !chosen.has(game.id)),
  };
}

/** How tonight's picks have done: of the picked games that are final, how many were right. */
export type PickTally = { right: number; decided: number };

/** Tonight's tally: picked finals only. A live pick is not decided, and a final without one is not counted. */
export function tonightPicks(
  games: readonly ScoreboardGame[],
  predictions: ReadonlyMap<string, SlatePick>,
): PickTally {
  const outcomes = games
    .map((game) => gamePickOutcome(predictions.get(game.id), game))
    .filter((outcome) => outcome != null);
  return {
    right: outcomes.filter((outcome) => outcome === "right").length,
    decided: outcomes.length,
  };
}

const WORDS = [
  "None",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
];

/** A count as a word up to ten ("Two", or "two" inside a sentence), in figures past it. */
export function spelled(count: number, capital = true): string {
  const word = WORDS[count] ?? String(count);
  return capital ? word : word.toLowerCase();
}

/** "Two of three tonight." Null when no picked game is final yet. */
export function tonightPicksSentence({ right, decided }: PickTally): string | null {
  if (decided === 0) return null;
  return `${spelled(right)} of ${spelled(decided, false)} tonight.`;
}

/** A season with a pick decided, or null. */
const decidedRecord = (record: SeasonRecord | null) =>
  record == null || record.right + record.wrong === 0 ? null : record;

/** "Right on 67% of games this season." Null until a pick has been decided. */
export function seasonPicksSentence(record: SeasonRecord | null): string | null {
  const decided = decidedRecord(record);
  if (decided == null) return null;
  const share = Math.round((decided.right / (decided.right + decided.wrong)) * 100);
  return `Right on ${share}% of games this season.`;
}

/** The Picks box's big record: "29–14". Null until a pick has been decided. */
export function picksScore(record: SeasonRecord | null): string | null {
  const decided = decidedRecord(record);
  return decided == null ? null : `${decided.right}–${decided.wrong}`;
}

/**
 * The Picks box's note: "Right on 67% of games this season. Two of three tonight." Either
 * sentence is left out when it has nothing to say; null when both do.
 */
export function picksNote(record: SeasonRecord | null, tonight: PickTally): string | null {
  const sentences = [seasonPicksSentence(record), tonightPicksSentence(tonight)];
  return sentences.filter((sentence) => sentence != null).join(" ") || null;
}

/**
 * A slate's date (`YYYY-MM-DD`) as the masthead writes it: "Sunday, October 11", or
 * "Sun, Oct 11" in the utility bar. Null before the first poll.
 */
export function datelineDate(
  date: string | null,
  length: "long" | "short" = "long",
): string | null {
  return date == null ? null : slateDate(date, length);
}

/** The masthead's dateline, both ways it is written. */
export type Dateline = {
  /**
   * The desktop's parts, in order: the long date, "Tonight: 9 games · 4 live · 2 to come · 3
   * final", "Picks this season: 29 right, 14 wrong". A part with nothing to say is not there.
   */
  wide: string[];
  /** The phone's one line: "9 games · 4 live · 3 final · Picks 29–14". */
  narrow: string;
};

const SEPARATOR = " · ";

/**
 * The dateline under the wordmark, from the slate and the season's record. A count of zero is
 * dropped. The phone has no room for the games to come or the postponed ones. Before any pick is
 * decided the picks are left out, and before the Scoreboard's first poll there is no dateline.
 */
export function dateline(
  slate: { date: string | null; games: readonly ScoreboardGame[] },
  record: SeasonRecord | null,
): Dateline {
  const date = datelineDate(slate.date);
  if (date == null) return { wide: [], narrow: "" };
  const counts = slateCounts([...slate.games]);
  const part = (count: number, word: string) => (count > 0 ? `${count} ${word}` : null);
  const total = slate.games.length;
  const games = total === 0 ? "no games" : `${total} game${total === 1 ? "" : "s"}`;
  const live = part(counts.live, "live");
  const final = part(counts.final, "final");
  const decided = decidedRecord(record);
  const present = (parts: (string | null)[]) => parts.filter((each) => each != null);
  return {
    wide: present([
      date,
      `Tonight: ${present([games, live, part(counts.upcoming, "to come"), final, part(counts.postponed, "postponed")]).join(SEPARATOR)}`,
      decided && `Picks this season: ${decided.right} right, ${decided.wrong} wrong`,
    ]),
    narrow: present([
      capitalized(games),
      live,
      final,
      decided && `Picks ${picksScore(decided)}`,
    ]).join(SEPARATOR),
  };
}
