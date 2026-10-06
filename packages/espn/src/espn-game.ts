import type { Game, GameSide, GameStatus } from "@yogan-hockey/schemas";
import { z } from "zod";
import { recordOnly } from "./espn-stats.ts";
import { EspnTeam, teamFrom } from "./espn-team.ts";

const EspnStatus = z.object({
  period: z.number(),
  displayClock: z.string(),
  type: z.object({
    state: z.enum(["pre", "in", "post"]),
    completed: z.boolean(),
    shortDetail: z.string(),
  }),
});

const EspnCompetitor = z.object({
  homeAway: z.enum(["home", "away"]),
  team: EspnTeam,
  // The scoreboard sends "3"; a schedule sends { value: 3 }, or nothing before the game.
  score: z.union([z.string(), z.object({ value: z.number() })]).nullish(),
  winner: z.boolean().nullish(),
  // The scoreboard's records carry a `summary`; a schedule's `record` carries a `displayValue`.
  records: z.array(z.object({ type: z.string(), summary: z.string() })).nullish(),
  record: z.array(z.object({ type: z.string(), displayValue: z.string() })).nullish(),
});
type EspnCompetitor = z.infer<typeof EspnCompetitor>;

const EspnCompetition = z
  .object({
    status: EspnStatus,
    competitors: z.array(EspnCompetitor),
    venue: z.object({ fullName: z.string().nullish() }).nullish(),
    // The scoreboard lists `names` per market; a schedule lists one `media` per broadcast.
    broadcasts: z
      .array(
        z.object({
          names: z.array(z.string()).nullish(),
          media: z.object({ shortName: z.string() }).nullish(),
        }),
      )
      .nullish(),
  })
  .transform((competition, context) => {
    const home = competition.competitors.find((competitor) => competitor.homeAway === "home");
    const away = competition.competitors.find((competitor) => competitor.homeAway === "away");
    if (!home || !away) {
      context.addIssue({
        code: "custom",
        path: ["competitors"],
        message: "expected one home and one away competitor",
      });
      return z.NEVER;
    }
    return { ...competition, home, away };
  });

/** A game as ESPN lists it on the scoreboard, on a team schedule and as a team's next event. */
export const EspnEvent = z
  .object({
    id: z.string(),
    // ESPN leaves the seconds off: "2026-10-06T23:00Z".
    date: z.string().transform((date, context) => {
      const start = new Date(date);
      if (Number.isNaN(start.getTime())) {
        context.addIssue({ code: "custom", message: `not a date: ${date}` });
        return z.NEVER;
      }
      return start.toISOString();
    }),
    // The scoreboard puts the season type inside `season`; a schedule puts it beside it.
    season: z.object({ year: z.number(), type: z.number().nullish() }),
    seasonType: z.object({ type: z.number() }).nullish(),
    competitions: z.tuple([EspnCompetition], z.unknown()),
  })
  .transform((event, context) => {
    const seasonType = event.season.type ?? event.seasonType?.type;
    if (seasonType == null) {
      context.addIssue({ code: "custom", path: ["seasonType"], message: "no season type" });
      return z.NEVER;
    }
    return { ...event, seasonType };
  });
type EspnEvent = z.infer<typeof EspnEvent>;

/** Read from the state and the completed flag. ESPN's status names are not relied on. */
function statusFrom({ state, completed }: z.infer<typeof EspnStatus>["type"]): GameStatus {
  if (state === "pre") return "scheduled";
  if (state === "in") return "live";
  return completed ? "final" : "postponed";
}

function scoreFrom(score: EspnCompetitor["score"]): number {
  if (score == null) return 0;
  return typeof score === "string" ? Number(score) : score.value;
}

/** ESPN calls the overall record "total" on a slate still to be played and "ytd" everywhere else. */
const OVERALL_RECORD_TYPES = ["total", "ytd"];

function recordFrom(competitor: EspnCompetitor): string | null {
  const records = [
    ...(competitor.records ?? []).map((record) => ({ type: record.type, text: record.summary })),
    ...(competitor.record ?? []).map((record) => ({
      type: record.type,
      text: record.displayValue,
    })),
  ];
  const overall = records.find((record) => OVERALL_RECORD_TYPES.includes(record.type));
  return overall ? recordOnly(overall.text) : null;
}

function sideFrom(competitor: EspnCompetitor, status: GameStatus): GameSide {
  return {
    ...teamFrom(competitor.team),
    score: scoreFrom(competitor.score),
    winner: status === "final" && competitor.winner === true,
    record: recordFrom(competitor),
  };
}

export function gameFrom(event: EspnEvent): Game {
  const [competition] = event.competitions;
  const status = statusFrom(competition.status.type);
  const broadcasts = (competition.broadcasts ?? []).flatMap(
    (broadcast) => broadcast.names ?? (broadcast.media ? [broadcast.media.shortName] : []),
  );
  return {
    id: event.id,
    startTime: event.date,
    season: event.season.year,
    seasonType: event.seasonType,
    status,
    period: competition.status.period,
    clock: competition.status.displayClock,
    detail: competition.status.type.shortDetail,
    home: sideFrom(competition.home, status),
    away: sideFrom(competition.away, status),
    venue: competition.venue?.fullName ?? null,
    broadcasts: [...new Set(broadcasts)],
  };
}
