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
import { EspnEvent, gameFrom } from "./espn-game.ts";
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
    // Only the overall record carries these, and not before the team has had a power play.
    powerPlayPct: statValue.optional(),
    penaltyKillPct: statValue.optional(),
  }),
});

const EspnAthlete = z.object({
  id: z.string(),
  fullName: z.string(),
  jersey: z.string().nullish(),
  position: z.object({ abbreviation: z.string() }),
  headshot: z.object({ href: z.string() }).nullish(),
});

const EspnTeamDetail = z.object({
  team: EspnTeam.extend({
    record: z.object({ items: z.array(EspnRecord).nullish() }).nullish(),
    standingSummary: z.string().nullish(),
    athletes: z.array(EspnAthlete).nullish(),
    nextEvent: z.array(EspnEvent).nullish(),
  }),
});

/** Translates a team detail response: the team, its record, stats, roster and next game. */
export function translateTeam(json: unknown, teamId: string): TeamDetail {
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
          overall: overall?.summary ?? null,
          home: records.get("home")?.summary ?? null,
          road: records.get("road")?.summary ?? null,
        },
        standingSummary: team.standingSummary ?? null,
        stats: overall
          ? {
              ...teamRecordFrom(overall.stats),
              powerPlayPct: overall.stats.powerPlayPct ?? null,
              penaltyKillPct: overall.stats.penaltyKillPct ?? null,
            }
          : null,
        roster: (team.athletes ?? []).map((athlete) => ({
          id: athlete.id,
          name: athlete.fullName,
          jersey: athlete.jersey ?? null,
          position: athlete.position.abbreviation,
          headshot: athlete.headshot?.href ?? null,
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
