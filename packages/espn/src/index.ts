/**
 * The only way NHL data reaches the site (ADR 0003). Each read fetches one ESPN endpoint, parses
 * the response through Zod and translates it into a shape from `@yogan-hockey/schemas`. ESPN's own
 * shapes stay inside this package.
 */
import { type Reading, ReadingSchema } from "@yogan-hockey/schemas";

export {
  getGameSummary,
  getPlayer,
  getPlayerCareer,
  getPlayerGameLog,
  getScoreboard,
  getStandings,
  getTeam,
  getTeamSchedule,
  getTeams,
  searchPlayers,
} from "./client.ts";
export { EspnFetchError, EspnParseError } from "./errors.ts";
// The translations on their own, for checking a response fetched some other way.
export {
  translatePlayer,
  translatePlayerCareer,
  translatePlayerGameLog,
  translatePlayerSearch,
} from "./player.ts";
export { translateScoreboard } from "./scoreboard.ts";
export { translateStandings } from "./standings.ts";
export { translateGameSummary } from "./summary.ts";
export { translateTeam, translateTeamSchedule, translateTeams } from "./team.ts";

/**
 * Walking-skeleton stand-in for an ESPN fetch (#31): every call produces a new
 * reading, so a page showing the same reading twice proves it came from the
 * cache. Replaced by the real client.
 */
export async function takeSkeletonReading(): Promise<Reading> {
  return ReadingSchema.parse({
    serial: crypto.randomUUID(),
    takenAt: new Date().toISOString(),
  });
}
