import { type Scoreboard, ScoreboardSchema } from "@yogan-hockey/schemas";
import { z } from "zod";
import { endpoints } from "./endpoints.ts";
import { EspnEvent, gameFrom } from "./espn-game.ts";
import { translateResponse } from "./translate.ts";

const EspnScoreboard = z.object({
  // Present on the current slate, absent when a date is asked for.
  day: z.object({ date: z.string() }).nullish(),
  events: z.array(EspnEvent),
});

/** Today's date where the NHL keeps its calendar, as `YYYY-MM-DD`. */
function easternDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(now);
}

/**
 * Translates a scoreboard response: ESPN's current slate, or the slate of the `YYYY-MM-DD` date
 * that was asked for.
 */
export function translateScoreboard(json: unknown, date?: string): Scoreboard {
  return translateResponse(
    endpoints.scoreboard(date),
    json,
    EspnScoreboard,
    ScoreboardSchema,
    (scoreboard) => ({
      date: date ?? scoreboard.day?.date ?? easternDate(new Date()),
      games: scoreboard.events.map(gameFrom),
    }),
  );
}
