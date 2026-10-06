import { type TrackedPlayer, TrackedPlayerSchema } from "@yogan-hockey/schemas";
import rylan from "../content/tracked-players/rylan.json";
import { calendarDay } from "./game-time";
import {
  type BioFact,
  type CareerView,
  careerView,
  type HeadlineStat,
  type SeasonView,
  type ShownColumn,
  statColumns,
  statValue,
} from "./player-view";

/*
 * The Tracked Players: family members whose seasons the site follows outside the NHL. Each is one
 * static file in `apps/web/content/tracked-players`, read here and nowhere else, and nothing about
 * one is ever fetched (spec §7, ADR 0005). Another family member is another file, imported and
 * added to FILES; `/family/:slug` and the dashboard's Family block then show them with no new code.
 */

const FILES: readonly unknown[] = [rylan];

/** Parsed as the module loads, so a file the schema refuses stops the build and not a visitor. */
const PLAYERS: readonly TrackedPlayer[] = FILES.map((file) => TrackedPlayerSchema.parse(file));

export function trackedPlayers(): readonly TrackedPlayer[] {
  return PLAYERS;
}

/** A Tracked Player by the `:slug` of the page. Null when there is no such file. */
export function trackedPlayer(slug: string): TrackedPlayer | null {
  return PLAYERS.find((player) => player.slug === slug) ?? null;
}

export const TRACKED_TABS = ["stats", "schedule"] as const;
export type TrackedTab = (typeof TRACKED_TABS)[number];

/** A tab's address. Stats is the default and is left out, so each tab has one address. */
export function trackedPlayerHref(slug: string, tab: TrackedTab = "stats"): string {
  return tab === "stats" ? `/family/${slug}` : `/family/${slug}?tab=${tab}`;
}

/** The tab a `?tab=` asks for. Anything unknown, or said twice, is Stats. */
export function trackedTabFrom(tab: string | string[] | undefined): TrackedTab {
  return TRACKED_TABS.find((known) => known === tab) ?? "stats";
}

export type TrackedHeader = {
  name: string;
  /** "Center · #99 · Chicago Falcons". Null when none of it is known. */
  detail: string | null;
  facts: BioFact[];
};

/** The header line: who he is, in the words a player page uses. */
export function headerOf(player: TrackedPlayer): TrackedHeader {
  const { profile, team } = player;
  const detail = [
    profile?.positionName ?? profile?.position,
    profile?.jersey ? `#${profile.jersey}` : undefined,
    team?.name,
  ].filter((part) => part !== undefined);
  return {
    name: player.name,
    detail: detail.length > 0 ? detail.join(" · ") : null,
    facts: profile?.hand
      ? [{ label: profile.position === "G" ? "catches" : "shoots", value: profile.hand }]
      : [],
  };
}

/** The current season's line. Nobody ranks it, so there is no rank row. */
export function seasonOf(player: TrackedPlayer): SeasonView | null {
  const season = player.currentSeason;
  if (!season) return null;
  return {
    season: season.season,
    stats: statColumns(season.columns).map((column, index) => ({
      label: column.label,
      value: season.values[index] ?? "",
      rank: null,
    })),
  };
}

/** The career table, newest season first, each row naming its club in words. */
export function careerOf(player: TrackedPlayer): CareerView | null {
  const career = player.career;
  if (!career) return null;
  // A player page's career, with the place in the list standing in for ESPN's season year.
  const view = careerView({
    playerId: player.slug,
    columns: career.columns,
    seasons: career.seasons.map((season, index) => ({
      year: index,
      season: season.season,
      team: null,
      values: season.values,
    })),
    totals: career.totals,
  });
  if (!view) return null;
  const clubs = career.seasons.map((season) => season.team).reverse();
  return { ...view, rows: view.rows.map((row, index) => ({ ...row, club: clubs[index] })) };
}

export type ScheduleRow = {
  key: string;
  /** "Oct 4" */
  date: string;
  /** "vs Loch Ness Monsters" at home, "at Yukon Yetis" away. */
  opponent: string;
};

export type ResultRow = ScheduleRow & {
  /** "W 14-2": his team's goals first. */
  result: string;
  values: string[];
};

export type ScheduleView = {
  season: string;
  columns: ShownColumn[];
  /** Soonest first. */
  upcoming: ScheduleRow[];
  /** Newest first. */
  results: ResultRow[];
};

/** Today as a file writes a date: `YYYY-MM-DD`, in UTC. */
const todayUtc = () => new Date().toISOString().slice(0, 10);

/**
 * The Schedule tab: the games to come and the games played, each with his line. A game with no
 * result whose day has passed is left out: the file is edited by hand, and an old date must not
 * stay listed as upcoming.
 */
export function scheduleOf(player: TrackedPlayer, today: string = todayUtc()): ScheduleView | null {
  const log = player.gameLog;
  if (!log) return null;
  // ISO dates sort, and compare, as text.
  const games = log.games.toSorted((a, b) => a.date.localeCompare(b.date));
  const row = (game: (typeof games)[number]): ScheduleRow => ({
    key: game.date,
    date: calendarDay(game.date),
    opponent: `${game.home ? "vs" : "at"} ${game.opponent}`,
  });
  return {
    season: log.season,
    columns: statColumns(log.columns),
    upcoming: games.filter((game) => game.played === null && game.date >= today).map(row),
    results: games
      .flatMap((game) =>
        game.played
          ? [
              {
                ...row(game),
                result: `${game.played.result} ${game.played.goalsFor}-${game.played.goalsAgainst}`,
                values: game.played.values,
              },
            ]
          : [],
      )
      .reverse(),
  };
}

export type FamilyRow = {
  slug: string;
  name: string;
  /** His page. */
  href: string;
  /** His club's name. */
  team: string | null;
  /** "2026-27" */
  season: string | null;
  /** GP, G, A and PTS of the current season: those of them his file has. */
  totals: HeadlineStat[];
  /** "Oct 4 vs Loch Ness Monsters, W 14-2" */
  lastGame: string | null;
};

const FAMILY_TOTALS = ["games", "goals", "assists", "points"];

/** One row of the dashboard's Family ledger (#47). */
export function familyRow(player: TrackedPlayer): FamilyRow {
  const season = player.currentSeason;
  const last = scheduleOf(player)?.results[0];
  return {
    slug: player.slug,
    name: player.name,
    href: trackedPlayerHref(player.slug),
    team: player.team?.name ?? null,
    season: season?.season ?? null,
    totals: season
      ? FAMILY_TOTALS.flatMap((name) => {
          const column = season.columns.find((candidate) => candidate.name === name);
          const value = statValue(season.columns, season.values, name);
          return column && value !== undefined ? [{ label: column.label, value }] : [];
        })
      : [],
    lastGame: last ? `${last.date} ${last.opponent}, ${last.result}` : null,
  };
}
