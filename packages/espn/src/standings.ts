import { type Standings, StandingsSchema } from "@yogan-hockey/schemas";
import { z } from "zod";
import { endpoints } from "./endpoints.ts";
import {
  espnStats,
  recordOnly,
  recordStats,
  statText,
  statValue,
  teamRecordFrom,
} from "./espn-stats.ts";
import { EspnTeam, teamFrom } from "./espn-team.ts";
import { translateResponse } from "./translate.ts";

const EspnEntry = z.object({
  team: EspnTeam,
  stats: espnStats({
    ...recordStats,
    regWins: statValue,
    rotWins: statValue,
    streak: statText,
    Home: statText,
    Road: statText,
    "Last Ten Games": statText,
  }),
});

const EspnDivision = z.object({
  name: z.string(),
  abbreviation: z.string(),
  standings: z.object({ entries: z.array(EspnEntry) }),
});

const EspnConference = z.object({
  name: z.string(),
  abbreviation: z.string(),
  children: z.array(EspnDivision),
});

const EspnStandings = z.object({
  season: z.object({ displayName: z.string() }),
  children: z.array(EspnConference),
});

/** Translates the standings response into one row per team. */
export function translateStandings(json: unknown): Standings {
  return translateResponse(
    endpoints.standings(),
    json,
    EspnStandings,
    StandingsSchema,
    (standings) => ({
      season: standings.season.displayName,
      rows: standings.children.flatMap((conference) =>
        conference.children.flatMap((division) =>
          division.standings.entries.map(({ team, stats }) => ({
            team: teamFrom(team),
            conference: { name: conference.name, abbreviation: conference.abbreviation },
            division: { name: division.name, abbreviation: division.abbreviation },
            ...teamRecordFrom(stats),
            regulationWins: stats.regWins,
            regulationPlusOvertimeWins: stats.rotWins,
            streak: stats.streak,
            homeRecord: stats.Home,
            roadRecord: stats.Road,
            lastTen: recordOnly(stats["Last Ten Games"]),
          })),
        ),
      ),
    }),
  );
}
