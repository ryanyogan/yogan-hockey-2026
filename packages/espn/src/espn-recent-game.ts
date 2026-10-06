import type { RecentGame } from "@yogan-hockey/schemas";
import { z } from "zod";
import { espnInstant } from "./espn-game.ts";

/**
 * A game already played, as ESPN lists it in a summary's last five games and in an athlete's game
 * log. Its `atVs` is not read: it says "vs" for some road games. The home team's id decides.
 */
export const EspnRecentGame = z.object({
  id: z.string(),
  gameDate: espnInstant,
  homeTeamId: z.string(),
  homeTeamScore: z.string(),
  awayTeamScore: z.string(),
  gameResult: z.string().nullish(),
  opponent: z.object({ id: z.string(), displayName: z.string(), abbreviation: z.string() }),
});
type EspnRecentGame = z.infer<typeof EspnRecentGame>;

/** The game as the team with `teamId` played it. */
export function recentGameFrom(game: EspnRecentGame, teamId: string): RecentGame {
  const home = game.homeTeamId === teamId;
  const homeScore = Number(game.homeTeamScore);
  const awayScore = Number(game.awayTeamScore);
  return {
    gameId: game.id,
    startTime: game.gameDate,
    home,
    opponent: {
      id: game.opponent.id,
      abbreviation: game.opponent.abbreviation,
      name: game.opponent.displayName,
    },
    result: game.gameResult ?? "",
    goalsFor: home ? homeScore : awayScore,
    goalsAgainst: home ? awayScore : homeScore,
  };
}
