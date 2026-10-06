import type {
  PlayerCareer,
  PlayerGameLog,
  PlayerProfile,
  StatColumn,
  TeamRef,
} from "@yogan-hockey/schemas";

/**
 * What a player page shows, worked out from ESPN's three answers about him: the season line, the
 * career table and the game log. ESPN's stat tables arrive as its own columns and display strings,
 * and some of its headings mislead, so every table passes through `shownColumns` on its way out.
 */

/** A column as the page heads it. `title` spells the abbreviation out. */
export type ShownColumn = { name: string; label: string; title: string | null };

export type HeadlineStat = { label: string; value: string };

/** ESPN's stat names whose ESPN heading says something else, with the heading the page uses. */
const LABELS: Record<string, string> = {
  // "SOG", which everywhere else in hockey, the Parity Reference included, is shots on goal.
  shootoutGoals: "S/O G",
  shootingPct: "S%",
  wins: "W",
  "wins-losses-overtimeLosses": "W-L-OTL",
  // "S": shots on goal, which the Parity Reference heads "SOG".
  shotsTotal: "SOG",
};

const TITLES: Record<string, string> = {
  games: "Games played",
  goals: "Goals",
  assists: "Assists",
  points: "Points",
  plusMinus: "Plus/minus",
  penaltyMinutes: "Penalty minutes",
  shootoutGoals: "Shootout goals",
  shootingPct: "Shooting percentage",
  shotsTotal: "Shots on goal",
  powerPlayGoals: "Power-play goals",
  powerPlayAssists: "Power-play assists",
  shortHandedGoals: "Short-handed goals",
  shortHandedAssists: "Short-handed assists",
  gameWinningGoals: "Game-winning goals",
  timeOnIcePerGame: "Time on ice per game",
  gameStarted: "Games started",
  wins: "Wins",
  losses: "Losses",
  ties: "Ties",
  overtimeLosses: "Overtime losses",
  goalsAgainst: "Goals against",
  avgGoalsAgainst: "Goals-against average",
  shotsAgainst: "Shots against",
  saves: "Saves",
  savePct: "Save percentage",
  shutouts: "Shutouts",
  "wins-losses-overtimeLosses": "Wins, losses, overtime losses",
};

/**
 * Never shown. ESPN's "PROD" is ice time per point, which the Parity Reference never had, and its
 * career total ("244:43") is not a figure anyone reads.
 */
const HIDDEN = new Set(["production"]);

function shownLabel(column: StatColumn, perGame: boolean): ShownColumn {
  // In a game log the column ESPN calls "TOI/G" is the ice time of that one game.
  if (perGame && column.name === "timeOnIcePerGame") {
    return { name: column.name, label: "TOI", title: "Time on ice" };
  }
  return {
    name: column.name,
    label: LABELS[column.name] ?? column.label,
    title: TITLES[column.name] ?? null,
  };
}

/** The columns the page shows, and a way to cut a row of values down to them. */
function shownColumns(columns: readonly StatColumn[], perGame = false) {
  const kept = columns.flatMap((column, index) => (HIDDEN.has(column.name) ? [] : [index]));
  return {
    columns: kept.map((index) => shownLabel(columns[index] as StatColumn, perGame)),
    pick: (values: readonly string[]) => kept.map((index) => values[index] ?? ""),
  };
}

/** A table's columns as the page heads them, for a table that hides none (a Tracked Player's). */
export function statColumns(columns: readonly StatColumn[]): ShownColumn[] {
  return columns.map((column) => shownLabel(column, false));
}

/** One value of a row, found by ESPN's name for its column. */
export function statValue(
  columns: readonly StatColumn[],
  values: readonly string[],
  name: string,
): string | undefined {
  const index = columns.findIndex((column) => column.name === name);
  return index < 0 ? undefined : values[index];
}

/** A display string as a number: "1,234" is 1234. NaN when it is not a number. */
function asNumber(shown: string | undefined): number {
  return shown === undefined || shown === "" ? Number.NaN : Number(shown.replace(/,/g, ""));
}

export type CareerRow = {
  key: string;
  /** "26-27" */
  season: string;
  /** Null on the row that totals a season split between clubs. */
  team: TeamRef | null;
  /** A club outside the NHL, named in words where `team` would be (a Tracked Player's). */
  club?: string;
  values: string[];
};

export type CareerView = {
  seasonCount: number;
  columns: ShownColumn[];
  /** Newest first. A split season's total comes ahead of the clubs it adds up. */
  rows: CareerRow[];
  /** One per column. Null when ESPN sends no totals. */
  totals: string[] | null;
  /** The career in one line, for the section's header. */
  headline: HeadlineStat[];
};

const SKATER_HEADLINE = ["games", "goals", "assists", "points"];
const GOALIE_HEADLINE = ["games", "wins", "avgGoalsAgainst", "savePct"];

function careerHeadline(career: PlayerCareer): HeadlineStat[] {
  const isGoalie = career.columns.some((column) => column.name === "savePct");
  const headline = (isGoalie ? GOALIE_HEADLINE : SKATER_HEADLINE).flatMap((name) => {
    const column = career.columns.find((candidate) => candidate.name === name);
    const value = statValue(career.columns, career.totals, name);
    return column && value !== undefined ? [{ label: shownLabel(column, false).label, value }] : [];
  });

  const games = asNumber(statValue(career.columns, career.totals, "games"));
  const points = asNumber(statValue(career.columns, career.totals, "points"));
  if (!isGoalie && games > 0 && Number.isFinite(points)) {
    // The Parity Reference heads this "PPG", which the table beside it uses for power-play goals.
    headline.push({ label: "P/GP", value: (points / games).toFixed(2) });
  }
  return headline;
}

/** The career table. Null for a player yet to play in the NHL. */
export function careerView(career: PlayerCareer): CareerView | null {
  if (career.seasons.length === 0) return null;
  const { columns, pick } = shownColumns(career.columns);

  return {
    seasonCount: new Set(career.seasons.map((season) => season.year)).size,
    columns,
    rows: career.seasons
      .map((season) => ({
        key: `${season.year}-${season.team?.id ?? "total"}`,
        season: season.season,
        team: season.team,
        values: pick(season.values),
      }))
      .reverse(),
    totals: career.totals.length > 0 ? pick(career.totals) : null,
    headline: careerHeadline(career),
  };
}

export type SeasonStat = { label: string; value: string; rank: string | null };

export type SeasonView = {
  /** "2026-27". Null when ESPN's title names no season. */
  season: string | null;
  stats: SeasonStat[];
};

/** The Parity Reference's Current Season, in its order. "shots" is counted from the game log. */
const SKATER_SEASON = [
  "games",
  "goals",
  "assists",
  "points",
  "penaltyMinutes",
  "plusMinus",
  "shotsTotal",
  "powerPlayGoals",
  "powerPlayAssists",
  "gameWinningGoals",
];
const GOALIE_SEASON = [
  "games",
  "gameStarted",
  "wins",
  "losses",
  "overtimeLosses",
  "avgGoalsAgainst",
  "savePct",
  "shutouts",
];

/** The shots column as ESPN's game log heads it, for a count that comes with no column. */
const SHOTS: StatColumn = { name: "shotsTotal", label: "S" };

/** His shots on goal over the games of a log: ESPN's career table has no shots column. */
function shotsIn(log: PlayerGameLog): string | undefined {
  const index = log.columns.findIndex((column) => column.name === "shotsTotal");
  if (index < 0 || log.games.length === 0) return undefined;
  return String(log.games.reduce((sum, game) => sum + (Number(game.values[index]) || 0), 0));
}

/**
 * The current season's line. ESPN's own summary is four figures; the career table's row for the
 * same season has the rest, so the line is read from that row and keeps the summary's league
 * ranks. A figure the row has no column for is the summary's, if the summary has it. Null when
 * ESPN has no summary for him.
 */
export function seasonView(
  profile: PlayerProfile,
  career: PlayerCareer,
  log: PlayerGameLog,
): SeasonView | null {
  const summary = profile.seasonSummary;
  if (!summary) return null;

  // "2026-27 regular season stats": ESPN's season year is the one the season ends in.
  const named = /(\d{4})-\d{2}/.exec(summary.title);
  const season = named?.[0] ?? null;
  const year = named ? Number(named[1]) + 1 : null;
  const rankOf = (name: string) => summary.stats.find((stat) => stat.name === name)?.rank ?? null;

  const ofSeason = career.seasons.filter((row) => row.year === year);
  const row = ofSeason.find((candidate) => candidate.team === null) ?? ofSeason[0];
  if (!row) {
    return {
      season,
      stats: summary.stats.map((stat) => ({
        label: shownLabel(stat, false).label,
        value: stat.value,
        rank: stat.rank,
      })),
    };
  }

  // The log's shots are the season's only when the log is that season and nothing else: ESPN's
  // log can hold playoff games beside the regular season's, so its games must number his GP.
  const sameSeason = season !== null && log.season?.startsWith(season);
  const sameGames = log.games.length === asNumber(statValue(career.columns, row.values, "games"));
  const shots = sameSeason && sameGames ? shotsIn(log) : undefined;
  const wanted = profile.position === "G" ? GOALIE_SEASON : SKATER_SEASON;
  const stats = wanted.flatMap((name): SeasonStat[] => {
    const column = career.columns.find((candidate) => candidate.name === name);
    // A figure the career row has no column for is the summary's own, when it has one.
    const summed = summary.stats.find((stat) => stat.name === name);
    const value =
      (name === "shotsTotal" ? shots : statValue(career.columns, row.values, name)) ??
      summed?.value;
    const labelled = column ?? summed ?? (name === "shotsTotal" ? SHOTS : undefined);
    return labelled && value !== undefined
      ? [{ label: shownLabel(labelled, false).label, value, rank: rankOf(name) }]
      : [];
  });
  return { season, stats };
}

export type GameLogRow = {
  gameId: string;
  /** "Oct 3" */
  date: string;
  /** "vs OTT" at home, "at OTT" away. */
  opponent: string;
  /** "L 2-3": his team's goals first. */
  result: string;
  values: string[];
};

export type GameLogView = {
  /** "2026-27 Regular Season": the latest season he played, which can be last season. */
  season: string | null;
  /** Every game of that season, of which `rows` is the latest few. */
  gameCount: number;
  columns: ShownColumn[];
  rows: GameLogRow[];
};

/** The league's calendar: a late game on the west coast belongs to the evening it started. */
const gameDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "America/New_York",
});

/** His latest `limit` games, newest first. Null when he has none. */
export function gameLogView(log: PlayerGameLog, limit: number): GameLogView | null {
  if (log.games.length === 0) return null;
  const { columns, pick } = shownColumns(log.columns, true);

  return {
    season: log.season,
    gameCount: log.games.length,
    columns,
    rows: log.games.slice(0, limit).map((game) => ({
      gameId: game.gameId,
      date: gameDate.format(new Date(game.startTime)),
      opponent: `${game.home ? "vs" : "at"} ${game.opponent.abbreviation}`,
      result: `${game.result} ${game.goalsFor}-${game.goalsAgainst}`,
      values: pick(game.values),
    })),
  };
}

export type BioFact = { label: string; value: string };

const birthDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** The facts under a player's name, each only where ESPN has it. */
export function bioFacts(profile: PlayerProfile): BioFact[] {
  const born = profile.birthDate
    ? birthDate.format(new Date(profile.birthDate)) +
      (profile.age === null ? "" : ` (${profile.age})`)
    : null;
  const facts: [label: string, value: string | null][] = [
    ["born", born],
    ["birthplace", profile.birthPlace],
    ["height", profile.height],
    ["weight", profile.weight],
    [profile.position === "G" ? "catches" : "shoots", profile.hand],
    ["drafted", profile.draft],
    ["experience", profile.experience],
  ];
  return facts.flatMap(([label, value]) => (value ? [{ label, value }] : []));
}
