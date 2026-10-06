import {
  PLAYER_SEARCH_LIMIT,
  type PlayerCareer,
  PlayerCareerSchema,
  type PlayerGameLog,
  PlayerGameLogSchema,
  type PlayerProfile,
  PlayerProfileSchema,
  type PlayerSearchResult,
  PlayerSearchResultSchema,
  type StatColumn,
} from "@yogan-hockey/schemas";
import { z } from "zod";
import { endpoints } from "./endpoints.ts";
import { EspnRecentGame, recentGameFrom } from "./espn-recent-game.ts";
import { EspnTeam, teamFrom } from "./espn-team.ts";
import { translateResponse } from "./translate.ts";

const EspnAthleteProfile = z.object({
  athlete: z.object({
    id: z.string(),
    displayName: z.string(),
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
    jersey: z.string().nullish(),
    position: z.object({ abbreviation: z.string(), displayName: z.string().nullish() }),
    headshot: z.object({ href: z.string() }).nullish(),
    team: EspnTeam.nullish(),
    displayHeight: z.string().nullish(),
    displayWeight: z.string().nullish(),
    // Day first: "17/9/1997" is 17 September.
    displayDOB: z.string().nullish(),
    age: z.number().nullish(),
    displayBirthPlace: z.string().nullish(),
    displayDraft: z.string().nullish(),
    displayExperience: z.string().nullish(),
    hand: z.object({ displayValue: z.string() }).nullish(),
    active: z.boolean().nullish(),
    statsSummary: z
      .object({
        displayName: z.string(),
        statistics: z.array(
          z.object({
            name: z.string(),
            abbreviation: z.string(),
            displayValue: z.string(),
            rankDisplayValue: z.string().nullish(),
          }),
        ),
      })
      .nullish(),
  }),
});

/** "17/9/1997" to "1997-09-17". Null for anything that is not a real day written that way. */
function birthDateFrom(displayDOB: string | null | undefined): string | null {
  const [, day, month, year] = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(displayDOB ?? "") ?? [];
  if (!day || !month || !year) return null;
  const date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  return z.iso.date().safeParse(date).success ? date : null;
}

/** Translates an athlete response into a player page's header and season summary. */
export function translatePlayer(json: unknown, athleteId: string): PlayerProfile {
  return translateResponse(
    endpoints.player(athleteId),
    json,
    EspnAthleteProfile,
    PlayerProfileSchema,
    ({ athlete }) => ({
      id: athlete.id,
      name: athlete.displayName,
      firstName: athlete.firstName ?? null,
      lastName: athlete.lastName ?? null,
      jersey: athlete.jersey ?? null,
      position: athlete.position.abbreviation,
      positionName: athlete.position.displayName ?? null,
      headshot: athlete.headshot?.href ?? null,
      team: athlete.team ? teamFrom(athlete.team) : null,
      height: athlete.displayHeight ?? null,
      weight: athlete.displayWeight ?? null,
      birthDate: birthDateFrom(athlete.displayDOB),
      age: athlete.age ?? null,
      birthPlace: athlete.displayBirthPlace ?? null,
      draft: athlete.displayDraft ?? null,
      experience: athlete.displayExperience ?? null,
      hand: athlete.hand?.displayValue ?? null,
      active: athlete.active ?? false,
      seasonSummary: athlete.statsSummary
        ? {
            title: athlete.statsSummary.displayName,
            stats: athlete.statsSummary.statistics.map((stat) => ({
              name: stat.name,
              label: stat.abbreviation,
              value: stat.displayValue,
              rank: stat.rankDisplayValue ?? null,
            })),
          }
        : null,
    }),
  );
}

/** ESPN sends a table's column names and headings as two lists in step. */
function columnsFrom(names: string[], labels: string[]): StatColumn[] {
  return names.map((name, index) => ({ name, label: labels[index] ?? name }));
}

const EspnAthleteStats = z.object({
  // Every club he has played for, keyed by its slug.
  teams: z
    .record(
      z.string(),
      z.object({ id: z.string(), abbreviation: z.string(), displayName: z.string() }),
    )
    .nullish(),
  // One table: the regular season. A player who has not played in the NHL has none.
  categories: z
    .array(
      z.object({
        names: z.array(z.string()),
        labels: z.array(z.string()),
        statistics: z.array(
          z.object({
            teamId: z.string().nullish(),
            season: z.object({ year: z.number(), displayName: z.string() }),
            stats: z.array(z.string()),
          }),
        ),
        totals: z.array(z.string()).nullish(),
      }),
    )
    .nullish(),
});

/** Translates an athlete's stats response into his career table. */
export function translatePlayerCareer(json: unknown, athleteId: string): PlayerCareer {
  return translateResponse(
    endpoints.playerCareer(athleteId),
    json,
    EspnAthleteStats,
    PlayerCareerSchema,
    ({ teams, categories }) => {
      const [table] = categories ?? [];
      const clubs = new Map(Object.values(teams ?? {}).map((team) => [team.id, team]));
      return {
        playerId: athleteId,
        columns: table ? columnsFrom(table.names, table.labels) : [],
        seasons: (table?.statistics ?? []).map((row) => {
          const club = row.teamId ? clubs.get(row.teamId) : undefined;
          return {
            year: row.season.year,
            season: row.season.displayName,
            team: club
              ? { id: club.id, abbreviation: club.abbreviation, name: club.displayName }
              : null,
            values: row.stats,
          };
        }),
        totals: table?.totals ?? [],
      };
    },
  );
}

const EspnAthleteGameLog = z.object({
  names: z.array(z.string()).nullish(),
  labels: z.array(z.string()).nullish(),
  // What each game was, keyed by event id. His line in it is in `seasonTypes`.
  events: z
    .record(z.string(), EspnRecentGame.extend({ team: z.object({ id: z.string() }) }))
    .nullish(),
  seasonTypes: z
    .array(
      z.object({
        displayName: z.string().nullish(),
        // One per month, newest first.
        categories: z.array(
          z.object({
            events: z
              .array(z.object({ eventId: z.string(), stats: z.array(z.string()) }))
              .nullish(),
          }),
        ),
      }),
    )
    .nullish(),
});

/** Translates an athlete's game log response into his latest season's games, newest first. */
export function translatePlayerGameLog(json: unknown, athleteId: string): PlayerGameLog {
  return translateResponse(
    endpoints.playerGameLog(athleteId),
    json,
    EspnAthleteGameLog,
    PlayerGameLogSchema,
    (log) => ({
      playerId: athleteId,
      season: log.seasonTypes?.[0]?.displayName ?? null,
      columns: columnsFrom(log.names ?? [], log.labels ?? []),
      games: (log.seasonTypes ?? [])
        .flatMap((seasonType) => seasonType.categories)
        .flatMap((month) => month.events ?? [])
        .flatMap((line) => {
          const game = log.events?.[line.eventId];
          return game ? { ...recentGameFrom(game, game.team.id), values: line.stats } : [];
        }),
    }),
  );
}

const EspnSearch = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        type: z.string(),
        league: z.string().nullish(),
        displayName: z.string(),
        jersey: z.string().nullish(),
        position: z.object({ abbreviation: z.string() }).nullish(),
        headshot: z.object({ href: z.string() }).nullish(),
        teamRelationships: z
          .array(
            z.object({
              core: z.object({
                id: z.string(),
                abbreviation: z.string(),
                displayName: z.string(),
              }),
            }),
          )
          .nullish(),
      }),
    )
    .nullish(),
});

/** Translates a search response into at most ten NHL players. Anything else it found is dropped. */
export function translatePlayerSearch(json: unknown, query: string): PlayerSearchResult[] {
  return translateResponse(
    endpoints.playerSearch(query),
    json,
    EspnSearch,
    z.array(PlayerSearchResultSchema),
    (search) =>
      (search.items ?? [])
        .filter((item) => item.type === "player" && item.league === "nhl")
        .slice(0, PLAYER_SEARCH_LIMIT)
        .map((item) => {
          const club = item.teamRelationships?.[0]?.core;
          return {
            id: item.id,
            name: item.displayName,
            jersey: item.jersey ?? null,
            position: item.position?.abbreviation ?? null,
            headshot: item.headshot?.href ?? null,
            team: club
              ? { id: club.id, abbreviation: club.abbreviation, name: club.displayName }
              : null,
          };
        }),
  );
}
