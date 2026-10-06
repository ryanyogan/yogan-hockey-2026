import {
  type GameHeader,
  type GameSummary,
  GameSummarySchema,
  type Play,
  type Pregame,
  type PregameSide,
  type SeasonSeries,
} from "@yogan-hockey/schemas";
import { z } from "zod";
import { endpoints, slug } from "./endpoints.ts";
import {
  EspnCompetitor,
  EspnStatusType,
  espnInstant,
  OVERALL_RECORD_TYPES,
  sideFrom,
  statusFrom,
} from "./espn-game.ts";
import { EspnRecentGame, recentGameFrom } from "./espn-recent-game.ts";
import { espnStats, recordOnly, statValue } from "./espn-stats.ts";
import { EspnTeam } from "./espn-team.ts";
import { translateResponse } from "./translate.ts";

// The summary also carries `pickcenter`, `odds` and `againstTheSpread`. They are betting lines:
// nothing below reads them, so they stop here (spec section 6).

/** The header names a team's short name `name` and leaves `shortDisplayName` out. */
const EspnHeaderTeam = EspnTeam.omit({ shortDisplayName: true })
  .extend({ name: z.string() })
  .transform((team) => ({ ...team, shortDisplayName: team.name }));

const EspnHeaderCompetitor = EspnCompetitor.extend({
  team: EspnHeaderTeam,
  linescores: z.array(z.unknown()).nullish(),
});
type EspnHeaderCompetitor = z.infer<typeof EspnHeaderCompetitor>;

const EspnHeader = z.object({
  id: z.string(),
  season: z.object({ year: z.number(), type: z.number() }),
  competitions: z.tuple(
    [
      z.object({
        date: espnInstant,
        // A game that is not being played has only the `type`: no period and no clock.
        status: z.object({
          type: EspnStatusType,
          period: z.number().nullish(),
          displayClock: z.string().nullish(),
        }),
        competitors: z.array(EspnHeaderCompetitor),
        broadcasts: z.array(z.object({ media: z.object({ shortName: z.string() }) })).nullish(),
      }),
    ],
    z.unknown(),
  ),
});

const EspnPlay = z.object({
  id: z.string(),
  type: z.object({
    text: z.string(),
    // "End of Game" has none.
    abbreviation: z.string().nullish(),
    // Only a penalty has minutes. There is one type per infraction and none called "penalty".
    penaltyMinutes: z.union([z.string(), z.number()]).nullish(),
  }),
  text: z.string().nullish(),
  homeScore: z.number(),
  awayScore: z.number(),
  period: z.object({ number: z.number(), displayValue: z.string().nullish() }),
  clock: z.object({ displayValue: z.string() }),
  scoringPlay: z.boolean().nullish(),
  team: z.object({ id: z.string() }).nullish(),
  participants: z
    .array(
      z.object({
        athlete: z.object({
          id: z.string(),
          displayName: z.string(),
          shortName: z.string().nullish(),
        }),
        type: z.string().nullish(),
      }),
    )
    .nullish(),
  wallclock: espnInstant.nullish(),
  coordinate: z.object({ x: z.number(), y: z.number() }).nullish(),
  strength: z.object({ abbreviation: z.string() }).nullish(),
});
type EspnPlay = z.infer<typeof EspnPlay>;

const EspnBoxscoreTeam = z.object({
  team: z.object({ id: z.string() }),
  statistics: z.array(z.object({ name: z.string(), displayValue: z.string() })).nullish(),
});

const EspnAthleteRef = z.object({
  id: z.string(),
  displayName: z.string(),
  position: z.object({ abbreviation: z.string() }).nullish(),
});

const EspnGoalies = z.object({
  teamId: z.string(),
  athletes: z
    .array(
      z.object({
        id: z.string(),
        displayName: z.string(),
        statistics: z.array(z.object({ name: z.string(), displayValue: z.string() })).nullish(),
      }),
    )
    .nullish(),
});

const EspnStandingsGroup = z.object({
  // "2026-27 Atlantic Division Standings"
  header: z.string(),
  standings: z.object({
    entries: z.array(
      z.object({
        id: z.string(),
        stats: espnStats({
          wins: statValue,
          losses: statValue,
          otLosses: statValue,
          points: statValue,
        }),
      }),
    ),
  }),
});

const EspnSeries = z.object({
  type: z.string(),
  summary: z.string().nullish(),
  events: z
    .array(
      z.object({
        id: z.string(),
        date: espnInstant,
        statusType: EspnStatusType.pick({ state: true, completed: true }),
        competitors: z.array(
          z.object({
            homeAway: z.enum(["home", "away"]),
            team: z.object({ id: z.string(), abbreviation: z.string() }),
            score: z.string().nullish(),
          }),
        ),
      }),
    )
    .nullish(),
});

function forTeam<Section>(section: z.ZodType<Section>) {
  return z.array(z.object({ team: z.object({ id: z.string() }) }).and(section)).nullish();
}

const EspnSummary = z.object({
  header: EspnHeader,
  // Absent until the game starts, and again once ESPN archives a game's play-by-play.
  plays: z.array(EspnPlay).nullish(),
  boxscore: z.object({ teams: z.array(EspnBoxscoreTeam).nullish() }).nullish(),
  gameInfo: z.object({ venue: z.object({ fullName: z.string().nullish() }).nullish() }).nullish(),
  standings: z.object({ groups: z.array(EspnStandingsGroup).nullish() }).nullish(),
  // The next two are sent only for a game still to be played.
  goalies: z.object({ homeTeam: EspnGoalies.nullish(), awayTeam: EspnGoalies.nullish() }).nullish(),
  lastFiveGames: forTeam(z.object({ events: z.array(EspnRecentGame).nullish() })),
  injuries: forTeam(
    z.object({
      injuries: z
        .array(
          z.object({
            status: z.string(),
            athlete: EspnAthleteRef,
            details: z
              .object({
                type: z.string().nullish(),
                detail: z.string().nullish(),
                returnDate: z.string().nullish(),
              })
              .nullish(),
          }),
        )
        .nullish(),
    }),
  ),
  leaders: forTeam(
    z.object({
      leaders: z
        .array(
          z.object({
            name: z.string(),
            leaders: z.array(z.object({ value: z.number(), athlete: EspnAthleteRef })).nullish(),
          }),
        )
        .nullish(),
    }),
  ),
  seasonseries: z.array(EspnSeries).nullish(),
});
type EspnSummary = z.infer<typeof EspnSummary>;

function playFrom(play: EspnPlay): Play {
  return {
    id: play.id,
    // "End of Game" has no abbreviation, so it is named from its wording: "end-of-game".
    type: play.type.abbreviation ?? slug(play.type.text),
    typeText: play.type.text,
    period: play.period.number,
    periodText: play.period.displayValue ?? String(play.period.number),
    clock: play.clock.displayValue,
    text: play.text ?? "",
    teamId: play.team?.id ?? null,
    coordinate: play.coordinate ?? null,
    scoring: play.scoringPlay === true,
    penalty: play.type.penaltyMinutes != null,
    homeScore: play.homeScore,
    awayScore: play.awayScore,
    strength: play.strength?.abbreviation ?? null,
    wallclock: play.wallclock ?? null,
    participants: (play.participants ?? []).map(({ athlete, type }) => ({
      athleteId: athlete.id,
      name: athlete.displayName,
      shortName: athlete.shortName ?? athlete.displayName,
      role: type ?? null,
    })),
  };
}

/** A count ESPN sends as text, such as shots of "28". Null when it is absent or not a number. */
function numberFrom(text: string | undefined): number | null {
  if (text === undefined || text.trim() === "") return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

function sides(summary: EspnSummary): { home: EspnHeaderCompetitor; away: EspnHeaderCompetitor } {
  const { competitors } = summary.header.competitions[0];
  const home = competitors.find((competitor) => competitor.homeAway === "home");
  const away = competitors.find((competitor) => competitor.homeAway === "away");
  if (!home || !away) {
    throw new z.ZodError([
      {
        code: "custom",
        path: ["header", "competitions", 0, "competitors"],
        message: "expected one home and one away competitor",
        input: competitors,
      },
    ]);
  }
  return { home, away };
}

function headerFrom(summary: EspnSummary): GameHeader {
  const { header } = summary;
  const [competition] = header.competitions;
  const { home, away } = sides(summary);
  const status = statusFrom(competition.status.type);
  const lastPlay = summary.plays?.at(-1);

  function shots(teamId: string): number {
    const team = summary.boxscore?.teams?.find((entry) => entry.team.id === teamId);
    const stat = team?.statistics?.find((entry) => entry.name === "shotsTotal");
    return numberFrom(stat?.displayValue) ?? 0;
  }

  return {
    id: header.id,
    startTime: competition.date,
    season: header.season.year,
    seasonType: header.season.type,
    status,
    // Without a period in the status, the last play says how far the game went, and failing
    // that the line score has one entry per period played.
    period: competition.status.period ?? lastPlay?.period.number ?? home.linescores?.length ?? 0,
    clock: competition.status.displayClock ?? "0:00",
    detail: competition.status.type.shortDetail,
    home: { ...sideFrom(home, status), shots: shots(home.team.id) },
    away: { ...sideFrom(away, status), shots: shots(away.team.id) },
    venue: summary.gameInfo?.venue?.fullName ?? null,
    broadcasts: [...new Set((competition.broadcasts ?? []).map((entry) => entry.media.shortName))],
  };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function pregameSideFrom(
  summary: EspnSummary,
  competitor: EspnHeaderCompetitor,
  goalies: z.infer<typeof EspnGoalies> | null | undefined,
): PregameSide {
  const teamId = competitor.team.id;
  const records = new Map((competitor.record ?? []).map((record) => [record.type, record]));
  const record = (...types: string[]) => {
    const text = types.map((type) => records.get(type)?.displayValue).find((found) => found);
    return text === undefined ? null : recordOnly(text);
  };

  let standing: PregameSide["standing"] = null;
  for (const group of summary.standings?.groups ?? []) {
    const index = group.standings.entries.findIndex((entry) => entry.id === teamId);
    const entry = group.standings.entries[index];
    if (!entry) continue;
    standing = {
      position: index + 1,
      division: group.header.replace(/^\d{4}-\d{2}\s+/, "").replace(/\s+Standings$/, ""),
      ...entry.stats,
    };
  }

  const mine = <Entry extends { team: { id: string } }>(entries: Entry[] | null | undefined) =>
    entries?.find((entry) => entry.team.id === teamId);

  return {
    teamId,
    record: {
      overall: record(...OVERALL_RECORD_TYPES),
      home: record("home"),
      road: record("road"),
    },
    standing,
    lastFive: (mine(summary.lastFiveGames)?.events ?? []).map((event) =>
      recentGameFrom(event, teamId),
    ),
    goalies: (goalies?.athletes ?? []).map((goalie) => {
      const stats = new Map(
        (goalie.statistics ?? []).map((stat) => [stat.name, numberFrom(stat.displayValue)]),
      );
      return {
        athleteId: goalie.id,
        name: goalie.displayName,
        gamesPlayed: stats.get("games") ?? null,
        wins: stats.get("wins") ?? null,
        losses: stats.get("losses") ?? null,
        otLosses: stats.get("overtimeLosses") ?? null,
        goalsAgainstAverage: stats.get("avgGoalsAgainst") ?? null,
        savePct: stats.get("savePct") ?? null,
        shutouts: stats.get("shutouts") ?? null,
      };
    }),
    injuries: (mine(summary.injuries)?.injuries ?? []).map(({ status, athlete, details }) => ({
      athleteId: athlete.id,
      name: athlete.displayName,
      position: athlete.position?.abbreviation ?? null,
      status,
      type: details?.type ?? null,
      detail: details?.detail ?? null,
      returnDate:
        details?.returnDate && ISO_DATE.test(details.returnDate) ? details.returnDate : null,
    })),
    leaders: (mine(summary.leaders)?.leaders ?? []).flatMap((category) => {
      const [leader] = category.leaders ?? [];
      if (!leader) return [];
      return {
        category: category.name,
        athleteId: leader.athlete.id,
        name: leader.athlete.displayName,
        position: leader.athlete.position?.abbreviation ?? null,
        value: leader.value,
      };
    }),
  };
}

function seasonSeriesFrom(summary: EspnSummary): SeasonSeries | null {
  const series = summary.seasonseries?.find((entry) => entry.type === "season");
  if (!series) return null;
  return {
    summary: series.summary ?? "",
    games: (series.events ?? []).flatMap((event) => {
      const side = (homeAway: "home" | "away") => {
        const competitor = event.competitors.find((entry) => entry.homeAway === homeAway);
        return (
          competitor && {
            teamId: competitor.team.id,
            abbreviation: competitor.team.abbreviation,
            score: numberFrom(competitor.score ?? undefined) ?? 0,
          }
        );
      };
      const home = side("home");
      const away = side("away");
      if (!home || !away) return [];
      return {
        gameId: event.id,
        startTime: event.date,
        status: statusFrom(event.statusType),
        home,
        away,
      };
    }),
  };
}

/**
 * A team's goalies: the list ESPN put that team's id on. Each list carries a `teamId`, which is
 * trusted over the `homeTeam` or `awayTeam` key it arrives under; the key decides only when
 * neither list names the team.
 */
function goaliesOf(
  summary: EspnSummary,
  competitor: EspnHeaderCompetitor,
  key: "homeTeam" | "awayTeam",
): z.infer<typeof EspnGoalies> | null | undefined {
  const lists = [summary.goalies?.homeTeam, summary.goalies?.awayTeam];
  return lists.find((list) => list?.teamId === competitor.team.id) ?? summary.goalies?.[key];
}

function pregameFrom(summary: EspnSummary): Pregame {
  const { home, away } = sides(summary);
  return {
    home: pregameSideFrom(summary, home, goaliesOf(summary, home, "homeTeam")),
    away: pregameSideFrom(summary, away, goaliesOf(summary, away, "awayTeam")),
    seasonSeries: seasonSeriesFrom(summary),
  };
}

/**
 * Translates ESPN's whole-game summary into the game header, the plays in ESPN's own order, and
 * what a Prediction is made from. Betting lines are left behind.
 */
export function translateGameSummary(json: unknown, gameId: string): GameSummary {
  return translateResponse(
    endpoints.summary(gameId),
    json,
    EspnSummary,
    GameSummarySchema,
    (summary) => ({
      header: headerFrom(summary),
      // ESPN's list order is the order of the game. `sequenceNumber` is not read.
      plays: (summary.plays ?? []).map(playFrom),
      pregame: pregameFrom(summary),
    }),
  );
}
