import type { WritingFacts } from "@yogan-hockey/schemas";

/**
 * The check a piece passes before it is stored as published (#217): the writing rules, read
 * against the facts the model was given. The prompt asks for the same things; this is what makes
 * them so. It errs towards refusing: a piece wrongly refused costs one more try or a day with
 * yesterday's piece still up, and a piece wrongly passed prints something untrue.
 *
 * What it cannot see: a number written as a word ("three straight"), and a claim no rule below
 * has a pattern for. The prompt is the only guard against those.
 */

/** The words of a piece: what the model answered, before it is joined into a body. */
export type PieceText = { headline: string; paragraphs: string[] };

/** Words whose full stop does not end a sentence, in lower case and without it. */
const ABBREVIATIONS = new Set(["st", "mr", "dr", "jr", "sr", "vs", "mt", "ft", "no", "p.m", "a.m"]);

/** The sentences of a text. A full stop after an initial or an abbreviation ends nothing. */
export function sentencesOf(text: string): string[] {
  const sentences: string[] = [];
  let start = 0;
  for (const match of text.matchAll(/(\S+?)([.!?]+)["')\]]*\s+/g)) {
    const word = (match[1] ?? "").replace(/^["'([]+/, "");
    const stopped = !/[!?]/.test(match[2] ?? "");
    const end = match.index + match[0].length;
    const abbreviated = /^\p{Lu}$/u.test(word) || ABBREVIATIONS.has(word.toLowerCase());
    // "at 10 p.m. The Kraken" is two sentences; "10 p.m. ET" and "10 p.m. on Monday" are one.
    const timeOfDay = /^[ap]\.m$/i.test(word) && /^(?!ET\b)\p{Lu}/u.test(text.slice(end));
    if (stopped && abbreviated && !timeOfDay) continue;
    sentences.push(text.slice(start, end).trim());
    start = end;
  }
  const rest = text.slice(start).trim();
  if (rest) sentences.push(rest);
  return sentences;
}

const WORD = /\p{L}[\p{L}\p{M}\d.'’-]*/gu;
const isCapital = (word: string) => /^\p{Lu}/u.test(word);
/** A word as it is compared: without a possessive or a full stop after it. */
const bare = (word: string) => word.replace(/[.'’]+$/, "").replace(/['’]s$/, "");
const wordsOf = (text: string) => [...text.matchAll(WORD)].map((match) => bare(match[0]));
const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Capital words every piece may use, whatever the facts. */
const ALWAYS = new Set(
  `NHL ET OT I Monday Tuesday Wednesday Thursday Friday Saturday Sunday January February March
  April May June July August September October November December Jan Feb Mar Apr Aug Sept Sep Oct
  Nov Dec East West Eastern Western Conference Division League`.split(/\s+/),
);

/**
 * Words a sentence may open with though the facts do not hold them: ordinary English, capital
 * only because of where they stand. A sentence that opens with anything else must open with a
 * name from the facts, so "Smith scored twice" does not pass as an ordinary word.
 */
const OPENERS = new Set(
  `a about above across after again against all almost along already also although among an and
  another any anyone anything around as at away back because before behind below beneath beside
  besides between beyond both but by can come could count despite do does down during each
  early either elsewhere even every everyone everything expect few first five for four from further
  give given goals going had half has have he held her here his home how however if in indeed
  instead into is it its just keep last late later less like little look make many meanwhile
  more most much neither never next nine no nobody none nor not nothing now of off on once one
  only or other others our out over overtime perhaps picks points puck put regulation road same
  second seven several she should since six so some something still such take ten than that the
  their then there these they third this those though three through thus to today together
  tonight too two under until up was watch we were what when where whether which while who whose
  why will with within without wins yesterday yet you eight eleven twelve
  it's that's there's here's what's tonight's yesterday's today's
  atop unbeaten winless overall earlier afterward afterwards top lost won led leading trailing
  third-period second-period first-period faceoff altogether combined between them neither
  elsewhere nowhere along among apart aside back-to-back best worst biggest closest longest
  hot cold fresh coming going playing sitting holding having being winning losing
  scoring standings games game teams team clubs club winners losers visitors hosts nights night`
    .split(/\s+/)
    .map(bare),
);

/**
 * A sentence also opens with a participle or an adverb often enough ("Trailing by one", "Tied
 * after two", "Twice the Kraken led") that no list holds them all. A surname can end the same way
 * (a Fleming, a Reed), so this lets such a name through when it opens a sentence and stands
 * alone: the prompt's rule that a player is first named in full is the guard there.
 */
const ORDINARY_OPENER = /^\p{Lu}\p{Ll}+(?:ing|ed|ly)$|^Twice$|^Thrice$/u;

/** A game of the facts as the pick rules need it. */
type PickedGame = { teams: [string, string]; pick: string | null; outcome?: "right" | "wrong" };

/** Everything the rules look up, worked out once from the facts. */
function indexOf(facts: WritingFacts) {
  /** Each way a team is named, to the teams it may mean: "New York" is two. */
  const aliases = new Map<string, Set<string>>();
  const teamNames: string[][] = [];
  for (const team of facts.teams) {
    for (const alias of [team.name, team.nickname, team.city, team.team]) {
      const meant = aliases.get(alias) ?? new Set<string>();
      aliases.set(alias, meant.add(team.team));
    }
    teamNames.push(wordsOf(team.name), wordsOf(team.city), wordsOf(team.nickname));
  }
  const people = new Set(facts.people ?? []);
  for (const final of facts.finals) {
    for (const goal of final.goals ?? [])
      for (const name of [goal.scorer, ...goal.assists]) people.add(name);
  }
  const personNames = [...people].map(wordsOf);

  const strings: string[] = [];
  const numbers = new Set<string>();
  const walk = (value: unknown): void => {
    if (typeof value === "string") strings.push(value);
    else if (typeof value === "number") numbers.add(String(value));
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  walk(facts);
  const words = new Set<string>();
  for (const text of strings) {
    for (const word of wordsOf(text)) words.add(word);
    for (const [token] of text.matchAll(NUMBER)) {
      numbers.add(token);
      // "7:00 p.m." is also "7 p.m.".
      if (token.endsWith(":00")) numbers.add(token.slice(0, -3));
      for (const part of token.split(/[.:]/)) numbers.add(String(Number(part)));
    }
  }

  const longestFirst = [...aliases.keys()].sort((a, b) => b.length - a.length);
  /** One team, however it is named, with "the" before it and a possessive after it. */
  const teamSource = `(?:[Tt]he )?(${longestFirst.map(escaped).join("|") || "\\b\\B"})(?:['’]s|['’])?`;
  const games: PickedGame[] = [
    ...facts.slate.map(({ away, home, pick }) => ({
      teams: [away, home] as [string, string],
      pick: pick?.team ?? null,
    })),
    ...facts.finals.map(({ away, home, pick }) => ({
      teams: [away, home] as [string, string],
      pick: pick?.team ?? null,
      outcome: pick?.outcome,
    })),
  ];
  return { aliases, teamNames, personNames, words, numbers, teamSource, games };
}
type Index = ReturnType<typeof indexOf>;

const NUMBER = /\d+(?:[.:]\d+)?/g;
const follows = (names: string[][], a: string, b: string) =>
  names.some((name) => name.some((word, at) => word === a && name[at + 1] === b));
const within = (names: string[][], word: string) => names.some((name) => name.includes(word));

/** A team's regex, bounded so "Wild" is not found in "Wildcard". */
const teamRegex = (index: Index, flags = "gu") =>
  new RegExp(`(?<![\\p{L}\\d])${index.teamSource}(?![\\p{L}\\d])`, flags);

/** The teams a sentence names, by abbreviation. */
function teamsNamed(sentence: string, index: Index): Set<string> {
  const named = new Set<string>();
  for (const match of sentence.matchAll(teamRegex(index))) {
    for (const team of index.aliases.get(match[1] ?? "") ?? []) named.add(team);
  }
  return named;
}

/** Rule: every team and player named is in the facts. */
function checkNames(sentence: string, index: Index, reasons: Set<string>): void {
  const tokens = [...sentence.matchAll(WORD)].map((match) => ({
    word: bare(match[0]),
    at: match.index,
    end: match.index + match[0].length,
  }));
  const unknown = (word: string) => reasons.add(`names "${word}", which is not in the facts`);
  let previous: (typeof tokens)[number] | null = null;
  for (const [position, token] of tokens.entries()) {
    const { word } = token;
    if (!isCapital(word)) {
      previous = null;
      continue;
    }
    const known = index.words.has(word);
    if (!known) {
      previous = null;
      if (ALWAYS.has(word)) continue;
      if (position === 0 && (OPENERS.has(word.toLowerCase()) || ORDINARY_OPENER.test(word)))
        continue;
      // "Kraken-Canucks": each half is a name of its own.
      const parts = word.split("-");
      if (parts.length > 1) {
        for (const part of parts) {
          if (isCapital(part) && !index.words.has(part) && !ALWAYS.has(part)) unknown(part);
        }
        continue;
      }
      unknown(word);
      continue;
    }
    // Two names side by side must be one name: not a first name from one player and a surname
    // from another, nor one club's city with another's nickname.
    const beside = previous !== null && sentence.slice(previous.end, token.at) === " ";
    if (beside && previous) {
      const a = previous.word;
      const people = within(index.personNames, a) && within(index.personNames, word);
      const clubs = within(index.teamNames, a) && within(index.teamNames, word);
      const together = follows(index.personNames, a, word) || follows(index.teamNames, a, word);
      if ((people || clubs) && !together) unknown(`${a} ${word}`);
    }
    previous = token;
  }
}

const RECORD = /(?<![\d–-])(\d{1,2})[–-](\d{1,2})[–-](\d{1,2})(?![\d–-])/g;
const SCORE = /(?<![\d–:-])(\d{1,2})\s?[–-]\s?(\d{1,2})(?![\d–:-])|\b(\d{1,2}) to (\d{1,2})\b/g;
const PERCENT = /(\d{1,3})\s?(?:%|percent\b)/g;
const blank = (text: string, pattern: RegExp) =>
  text.replace(pattern, (found) => " ".repeat(found.length));

/** Every score a final passed through, away then home: 0-0, each goal, and the final itself. */
function scoresOf(final: WritingFacts["finals"][number]): [number, number][] {
  const scores: [number, number][] = [[final.awayScore, final.homeScore]];
  let away = 0;
  let home = 0;
  for (const goal of final.goals ?? []) {
    if (goal.team === final.away) away += 1;
    else home += 1;
    scores.push([away, home]);
  }
  return scores;
}

/** A word that makes the score beside it a final score. */
const RESULT = /\b(?:won|wins|win|beat|beats|defeated|topped|edged|downed|blanked|routed|final)\b/i;

const WON =
  "beat|beats|defeated|defeats|topped|edged|downed|blanked|shut out|outlasted|routed|upset|got past|held off|knocked off|handled|doubled up";

/** Rule: every score, record, percentage and other figure matches the facts. */
function checkFigures(sentence: string, facts: WritingFacts, index: Index, reasons: Set<string>) {
  const named = teamsNamed(sentence, index);
  const teams = facts.teams.filter((team) => named.size === 0 || named.has(team.team));
  let text = sentence;

  const records = new Set(
    teams.flatMap((team) => [team.record, team.homeRecord, team.roadRecord, team.lastTen]),
  );
  for (const [found, wins, losses, overtime] of text.matchAll(RECORD)) {
    if (!records.has(`${wins}-${losses}-${overtime}`)) {
      reasons.add(`gives a record of ${found} that the facts do not hold for the team named`);
    }
  }
  text = blank(text, RECORD);

  // "Kraken 5, Capitals 3": each score belongs to the team it stands beside.
  const line = new RegExp(
    `${index.teamSource} (\\d{1,2}), ${index.teamSource} (\\d{1,2})(?!\\d)`,
    "gu",
  );
  for (const [found, first, firstScore, second, secondScore] of text.matchAll(line)) {
    const a = index.aliases.get(first ?? "") ?? new Set();
    const b = index.aliases.get(second ?? "") ?? new Set();
    const played = facts.finals.some(
      (final) =>
        (a.has(final.away) &&
          b.has(final.home) &&
          final.awayScore === Number(firstScore) &&
          final.homeScore === Number(secondScore)) ||
        (a.has(final.home) &&
          b.has(final.away) &&
          final.homeScore === Number(firstScore) &&
          final.awayScore === Number(secondScore)),
    );
    if (!played) reasons.add(`gives a score, "${found}", that matches no final in the facts`);
  }
  text = blank(text, line);

  const both = facts.finals.filter((final) => named.has(final.away) && named.has(final.home));
  const either = facts.finals.filter((final) => named.has(final.away) || named.has(final.home));
  const finals = both.length > 0 ? both : named.size > 0 ? either : facts.finals;
  // Beside a word for winning, a score is the final one, not one the game passed through.
  const result = RESULT.test(sentence);
  for (const match of text.matchAll(SCORE)) {
    const a = Number(match[1] ?? match[3]);
    const b = Number(match[2] ?? match[4]);
    const reached = finals.some((final) =>
      (result ? scoresOf(final).slice(0, 1) : scoresOf(final)).some(
        ([away, home]) => (away === a && home === b) || (away === b && home === a),
      ),
    );
    if (!reached) reasons.add(`gives a score of ${match[0]} that matches no final in the facts`);
  }
  text = blank(text, SCORE);

  const picks = [...facts.slate, ...facts.finals].flatMap(({ pick }) => (pick ? [pick] : []));
  for (const [found, percent] of text.matchAll(PERCENT)) {
    const held = picks.some(
      (pick) =>
        pick.winProbability === Number(percent) && (named.size === 0 || named.has(pick.team)),
    );
    if (!held) reasons.add(`gives a chance of ${found} that is not the site's pick`);
  }
  text = blank(text, PERCENT);

  for (const [figure] of text.matchAll(NUMBER)) {
    if (!index.numbers.has(figure))
      reasons.add(`gives a figure, ${figure}, that is not in the facts`);
  }

  // "The Capitals won 5-3": the team that won is a final's winner.
  const winning = new RegExp(
    `${index.teamSource},? (?:won|wins|win|prevailed)(?![\\p{L}\\d])`,
    "gu",
  );
  for (const [found, winner] of sentence.matchAll(winning)) {
    const won = index.aliases.get(winner ?? "") ?? new Set();
    if (facts.finals.length > 0 && !facts.finals.some((final) => won.has(final.winner))) {
      reasons.add(`says "${found}", and no final in the facts has that result`);
    }
  }

  // A points total, a place and a streak are the named team's own, not any number in the facts.
  if (named.size > 0) {
    const own = (held: (team: (typeof teams)[number]) => boolean) => teams.some(held);
    for (const [found, points] of sentence.matchAll(/\b(\d+) points\b/g)) {
      if (!own((team) => team.points === Number(points))) {
        reasons.add(`gives "${found}", which is not the named team's total`);
      }
    }
    const placed = /\b(\d+(?:st|nd|rd|th)) (?:in (?:the|its) |place\b)/g;
    for (const [found, place] of sentence.matchAll(placed)) {
      if (!own((team) => team.divisionPlace === place)) {
        reasons.add(`gives "${found.trim()}", which is not the named team's place`);
      }
    }
    const streak =
      /\b(won|lost|winning|losing|wins|losses)\b[^.;]*?\b(\d+) (?:in a row|straight|consecutive)/g;
    for (const [found, word, count] of sentence.matchAll(streak)) {
      const run = `${/^w/.test(word ?? "") ? "won" : "lost"} ${count}`;
      if (!own((team) => team.streak === run || team.streak?.startsWith(`${run} `) === true)) {
        reasons.add(`gives a streak, "${found}", which is not the named team's`);
      }
    }
  }

  const beat = new RegExp(`${index.teamSource} (?:${WON}) ${index.teamSource}`, "gu");
  for (const [found, winner, loser] of sentence.matchAll(beat)) {
    const won = index.aliases.get(winner ?? "") ?? new Set();
    const lost = index.aliases.get(loser ?? "") ?? new Set();
    const happened = facts.finals.some((final) => {
      const beaten = final.winner === final.away ? final.home : final.away;
      return won.has(final.winner) && lost.has(beaten);
    });
    if (!happened) reasons.add(`says "${found}", and no final in the facts has that result`);
  }
}

const PICK_WORD =
  /\b(?:picks?|picked|favou?rs?|favou?red|favou?rites?|predictions?|predicted|predicts|tipped)\b/i;
const PICK_NOUN = "pick|picks|nod|favou?rite|prediction";
const PICKED =
  "picked|favou?red|tipped|predicted to win|expected to win|the favou?rite|(?:the|our|the site's|tonight's) pick";
const PICKS_VERB =
  "picks?|picked|favou?rs?|favou?red|leans? (?:to|toward|towards)|leaned (?:to|toward|towards)|sides? with|sided with|go(?:es|ing)? with|went with|predicts?|predicted|tips?|tipped";
const FORECAST =
  "will|should|ought to|is going to|are going to|is expected to|are expected to|is likely to|are likely to|is set to|are set to|looks? set to";
/** Words that turn a sentence about a pick towards the team it was not. */
const TURNED =
  /\b(?:against|wrong|wrongly|miss|missed|upset|beat|despite|lost|loss|losing|burned|over|but)\b/i;
const RIGHT = /\b(?:right|correct|correctly|held up|came through|paid off|landed)\b/i;
const WRONG = /\b(?:wrong|wrongly|miss|missed|incorrect|burned|failed|whiffed)\b/i;

/** Rule: nothing contradicts the Predictions, and the piece makes none of its own. */
function checkPicks(
  sentence: string,
  index: Index,
  reasons: Set<string>,
  before: string | null,
): void {
  const T = index.teamSource;
  const teamsOf = (alias: string | undefined) =>
    index.aliases.get(alias ?? "") ?? new Set<string>();
  const playing = (teams: Set<string>) =>
    index.games.filter((game) => game.teams.some((team) => teams.has(team)));

  const claims: string[] = [];
  const claimed = (pattern: string) => {
    for (const match of sentence.matchAll(new RegExp(pattern, "gu"))) {
      if (match[1]) claims.push(match[1]);
    }
  };
  // "Seattle is the pick", "the Kraken are favored".
  claimed(`${T},? (?:is|are|was|were|remains?|gets?|got|stays?) (?:${PICKED})`);
  // "Our pick: Seattle", "the pick is the Kraken", "the nod goes to Seattle".
  claimed(
    `(?<!\\bno )\\b(?:${PICK_NOUN})(?: here| tonight)?(?: is| are| was| were| goes to| go to| went to|:|,)? (?:on |with )?${T}`,
  );
  // "The site picks Seattle", "we lean toward the Kraken".
  claimed(`\\b(?:${PICKS_VERB}) ${T}`);
  // A forecast of the piece's own must be the site's: "Seattle will win".
  claimed(`${T} (?:${FORECAST}) (?:win|beat|take|prevail|come out|edge|handle)`);

  // "Expect Vegas to win", "Vegas has the edge".
  claimed(`\\b[Ee]xpect ${T} to (?:win|beat|take|prevail|come out|edge|handle)`);
  claimed(`${T} (?:has|have|holds?|gets?|carr(?:y|ies)) the (?:edge|upper hand|advantage)`);

  for (const alias of claims) {
    const teams = teamsOf(alias);
    const games = playing(teams);
    if (games.some((game) => game.pick !== null && teams.has(game.pick))) continue;
    const other = games.find((game) => game.pick !== null)?.pick;
    reasons.add(
      other
        ? `says the pick is ${alias}, and the site's pick is ${other}`
        : `says the pick is ${alias}, and the site has no pick for that game`,
    );
  }

  // "Picked up 2 points" is no pick.
  const ofPicks = (text: string) => PICK_WORD.test(text.replace(/\bpick(?:ed|s|ing)? up\b/gi, ""));
  const carried = before !== null && ofPicks(before) && teamsNamed(sentence, index).size === 0;
  if (!ofPicks(sentence) && !carried) return;
  // "the pick is Seattle over Vancouver": the team after "over" is the one not picked.
  for (const match of sentence.matchAll(new RegExp(`\\b(?:over|not) ${T}`, "gu"))) {
    const teams = teamsOf(match[1]);
    const picked = playing(teams).filter((game) => game.pick !== null);
    if (picked.length > 0 && picked.every((game) => teams.has(game.pick ?? ""))) {
      reasons.add(`says the pick is against ${match[1]}, and ${match[1]} is the site's pick`);
    }
  }

  const here = teamsNamed(sentence, index);
  // "Our pick was Buffalo. It was right.": a sentence that names no team speaks of the last one's.
  const named = here.size === 0 && before !== null ? teamsNamed(before, index) : here;
  const games = playing(named).filter((game) => game.pick !== null);
  const none = /\bno pick\b/i.test(sentence);
  if (!none && claims.length === 0 && here.size > 0 && games.length > 0 && !TURNED.test(sentence)) {
    // A sentence about the pick that names only the team the site did not pick.
    if (!games.some((game) => named.has(game.pick ?? ""))) {
      reasons.add(`speaks of the pick and names only a team the site did not pick`);
    }
  }
  const marked = games.filter((game) => game.outcome !== undefined);
  if (marked.length > 0) {
    const right = RIGHT.test(sentence);
    const wrong = WRONG.test(sentence);
    if (right && !wrong && marked.every((game) => game.outcome === "wrong")) {
      reasons.add("says a pick was right that the facts mark wrong");
    }
    if (wrong && !right && marked.every((game) => game.outcome === "right")) {
      reasons.add("says a pick was wrong that the facts mark right");
    }
  }
}

const SAID =
  /\b(?:said|told|called it|called the|according to|stated|remarked|commented|explained|quipped|insisted|admitted|quoted|reporters?|interview|press conference)\b/i;

/** Rule: no quotes, and nobody is given words. */
function checkQuotes(sentence: string, reasons: Set<string>): void {
  if (/["“”«»]/.test(sentence) || /(?:^|[\s(])['‘]\S/.test(sentence)) {
    reasons.add("uses quotation marks: a piece quotes nobody");
  }
  // "The pick says" is the site speaking; "Wilson says" is a person.
  const said = SAID.exec(sentence) ?? /(?<=\p{Lu}[\p{L}'’-]+ )says\b/u.exec(sentence);
  if (said) reasons.add(`attributes words to someone ("${said[0]}"): a piece quotes nobody`);
}

/** What the facts do not hold, and so what a piece does not speak of. */
const NOT_HELD: [string, RegExp][] = [
  [
    "injuries",
    /\b(?:injur\w*|hurt|out with|will miss|broken|concussion|surgery|illness|sidelined|day-to-day|week-to-week|lower-body|upper-body|questionable|doubtful|ailing|rehab\w*)\b/i,
  ],
  ["injuries", /\bIR\b/],
  [
    "trades and signings",
    /\b(?:trad(?:e|es|ed|ing)(?! (?:goals|chances|leads|blows))|dealt|waivers?|signed|signing|re-signed|contracts?|extension|free agen\w*|acquired|acquisition|call-up|called up|recalled|sent down|scratch(?:ed|es)?)\b/i,
  ],
  ["suspensions and discipline", /\b(?:suspen\w*|fined|fines)\b/i],
  ["coaches and front offices", /\b(?:coach\w*|general manager|fired|hired)\b/i],
  ["coaches and front offices", /\bGM\b/],
  ["rumours", /\b(?:rumou?r\w*|sources?|reportedly|reports)\b/i],
  [
    "betting",
    /\b(?:odds|bet|bets|betting|bettors?|wager\w*|moneyline|sportsbooks?|parlay|over\/under)\b/i,
  ],
];

/** Rule: nothing about injuries, trades or anything else the facts do not hold. */
function checkTopics(sentence: string, reasons: Set<string>): void {
  for (const [topic, pattern] of NOT_HELD) {
    const found = pattern.exec(sentence);
    if (found) reasons.add(`speaks of ${topic} ("${found[0]}"), which the facts do not hold`);
  }
}

/**
 * Why a piece may not be published: one line for each thing wrong with it, in words the model
 * can be handed back. Empty when the piece passes every rule.
 */
export function checkPiece(piece: PieceText, facts: WritingFacts): string[] {
  const index = indexOf(facts);
  const reasons = new Set<string>();
  for (const text of [piece.headline, ...piece.paragraphs]) {
    let before: string | null = null;
    for (const sentence of sentencesOf(text)) {
      checkNames(sentence, index, reasons);
      checkFigures(sentence, facts, index, reasons);
      checkPicks(sentence, index, reasons, before);
      before = sentence;
      checkQuotes(sentence, reasons);
      checkTopics(sentence, reasons);
    }
  }
  return [...reasons];
}
