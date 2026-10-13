import {
  type Team,
  type TeamDetail,
  TeamDetailSchema,
  type TeamSchedule,
  TeamScheduleSchema,
  TeamSchema,
} from "@yogan-hockey/schemas";
import { z } from "zod";
import { endpoints } from "./endpoints.ts";
import { EspnNotFoundError } from "./errors.ts";
import { EspnEvent, gameFrom } from "./espn-game.ts";
import { espnHeadshot } from "./espn-headshot.ts";
import { espnStats, recordStats, statValue, teamRecordFrom } from "./espn-stats.ts";
import { EspnTeam, teamFrom } from "./espn-team.ts";
import { translateResponse } from "./translate.ts";

const EspnTeamList = z.object({
  sports: z.tuple(
    [
      z.object({
        leagues: z.tuple([z.object({ teams: z.array(z.object({ team: EspnTeam })) })], z.unknown()),
      }),
    ],
    z.unknown(),
  ),
});

/** Translates the team list response into every NHL team. */
export function translateTeams(json: unknown): Team[] {
  return translateResponse(endpoints.teams(), json, EspnTeamList, z.array(TeamSchema), (list) =>
    list.sports[0].leagues[0].teams.map(({ team }) => teamFrom(team)),
  );
}

const EspnRecord = z.object({
  type: z.string(),
  summary: z.string(),
  stats: espnStats({
    ...recordStats,
    // Only the overall record carried these, and not before the team had had a power play. ESPN
    // has sent neither since 2026-10-12, only the counts they are worked out from.
    powerPlayPct: statValue.optional(),
    penaltyKillPct: statValue.optional(),
    powerPlayGoals: statValue.optional(),
    powerPlayOpportunities: statValue.optional(),
    powerPlayGoalsAgainst: statValue.optional(),
    timesShortHanded: statValue.optional(),
    // Since 2026-10-12 the home and road records are counts on the overall record, where they
    // were records of their own.
    homeWins: statValue.optional(),
    homeLosses: statValue.optional(),
    homeOtLosses: statValue.optional(),
    awayWins: statValue.optional(),
    awayLosses: statValue.optional(),
    awayOtLosses: statValue.optional(),
  }),
});
type EspnRecord = z.infer<typeof EspnRecord>;

const WIN_LOSS_OVERTIME = /^\d+-\d+-\d+$/;

/** "3-2-1" from its three counts, or null when ESPN left any of them out. */
function recordFrom(wins?: number, losses?: number, otLosses?: number): string | null {
  return wins == null || losses == null || otLosses == null
    ? null
    : `${wins}-${losses}-${otLosses}`;
}

/**
 * The overall record as the site prints one, "3-2-1". ESPN's summary was that until 2026-10-12
 * and has left the overtime losses out since ("3-2"), so it is then made from the counts.
 */
function overallRecord({ summary, stats }: EspnRecord): string {
  return WIN_LOSS_OVERTIME.test(summary)
    ? summary
    : `${stats.wins}-${stats.losses}-${stats.otLosses}`;
}

/** `made` of `chances` as a percentage to three places, as ESPN sent its own: 2 of 11 is 18.182. */
function percentage(made?: number, chances?: number): number | null {
  if (made == null || chances == null || chances <= 0) return null;
  return Math.round((made / chances) * 100_000) / 1000;
}

/** The share of power plays scored on. ESPN's own figure where it sends one. */
function powerPlayPct(stats: EspnRecord["stats"]): number | null {
  return stats.powerPlayPct ?? percentage(stats.powerPlayGoals, stats.powerPlayOpportunities);
}

/** The share of times short-handed that no goal was allowed. ESPN's own figure where it sends one. */
function penaltyKillPct(stats: EspnRecord["stats"]): number | null {
  if (stats.penaltyKillPct != null) return stats.penaltyKillPct;
  const { timesShortHanded: times, powerPlayGoalsAgainst: against } = stats;
  return against == null || times == null ? null : percentage(times - against, times);
}

const EspnAthlete = z.object({
  id: z.string(),
  fullName: z.string(),
  jersey: z.string().nullish(),
  position: z.object({ abbreviation: z.string() }),
  headshot: espnHeadshot,
});

const EspnTeamDetail = z.object({
  team: EspnTeam.extend({
    record: z.object({ items: z.array(EspnRecord).nullish() }).nullish(),
    standingSummary: z.string().nullish(),
    athletes: z.array(EspnAthlete).nullish(),
    nextEvent: z.array(EspnEvent).nullish(),
  }),
});

/**
 * ESPN's two answers for a team id no team has, both with a 200: `{}` (999, and every id it has
 * never used), and for id 0 a placeholder, an inactive team with no name. Anything else that does
 * not parse is a response the site cannot read, which is a different failure.
 */
function isNoTeam(json: unknown): boolean {
  if (typeof json !== "object" || json === null || Array.isArray(json)) return false;
  if (Object.keys(json).length === 0) return true;
  const team: unknown = "team" in json ? json.team : null;
  if (typeof team !== "object" || team === null) return false;
  return "isActive" in team && team.isActive === false && !("displayName" in team);
}

/**
 * Translates a team detail response: the team, its record, stats, roster and next game. A team
 * ESPN does not know is an `EspnNotFoundError`.
 */
export function translateTeam(json: unknown, teamId: string): TeamDetail {
  if (isNoTeam(json)) throw new EspnNotFoundError(endpoints.team(teamId).name, "no such team");
  return translateResponse(
    endpoints.team(teamId),
    json,
    EspnTeamDetail,
    TeamDetailSchema,
    ({ team }) => {
      const records = new Map((team.record?.items ?? []).map((record) => [record.type, record]));
      const overall = records.get("total");
      const [nextEvent] = team.nextEvent ?? [];
      return {
        team: teamFrom(team),
        record: {
          overall: overall ? overallRecord(overall) : null,
          home:
            records.get("home")?.summary ??
            recordFrom(
              overall?.stats.homeWins,
              overall?.stats.homeLosses,
              overall?.stats.homeOtLosses,
            ),
          road:
            records.get("road")?.summary ??
            recordFrom(
              overall?.stats.awayWins,
              overall?.stats.awayLosses,
              overall?.stats.awayOtLosses,
            ),
        },
        standingSummary: team.standingSummary ?? null,
        stats: overall
          ? {
              ...teamRecordFrom(overall.stats),
              powerPlayPct: powerPlayPct(overall.stats),
              penaltyKillPct: penaltyKillPct(overall.stats),
            }
          : null,
        roster: (team.athletes ?? []).map((athlete) => ({
          id: athlete.id,
          name: athlete.fullName,
          jersey: athlete.jersey ?? null,
          position: athlete.position.abbreviation,
          headshot: athlete.headshot ?? null,
        })),
        nextGame: nextEvent ? gameFrom(nextEvent) : null,
      };
    },
  );
}

const EspnTeamSchedule = z.object({
  season: z.object({ displayName: z.string() }),
  events: z.array(EspnEvent),
});

/** Translates a team schedule response into the season's games, in date order. */
export function translateTeamSchedule(json: unknown, teamId: string): TeamSchedule {
  return translateResponse(
    endpoints.teamSchedule(teamId),
    json,
    EspnTeamSchedule,
    TeamScheduleSchema,
    (schedule) => ({
      teamId,
      season: schedule.season.displayName,
      games: schedule.events
        .map(gameFrom)
        .toSorted((a, b) => a.startTime.localeCompare(b.startTime)),
    }),
  );
}
