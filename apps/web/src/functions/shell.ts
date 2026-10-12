import { createServerFn } from "@tanstack/react-start";
import type { ScoreboardReading, SeasonRecord } from "@yogan-hockey/schemas";
import { readScoreboard } from "../../lib/scoreboard";
import { readSeasonRecord } from "../../lib/season-record";

/** What the shell draws on every page: today's games and the season's record of the picks. */
export type ShellRead = { scoreboard: ScoreboardReading; record: SeasonRecord | null };

/**
 * The root route's read, for the masthead, the score strip and the provider's first value. A page
 * is still worth showing when the Scoreboard cannot be reached: it starts without games and the
 * socket supplies them. It never fails, and so no page fails for the shell's sake.
 */
export const readShell = createServerFn({ method: "GET" }).handler(async (): Promise<ShellRead> => {
  const scoreboard = await scoreboardForFirstPaint();
  // The dateline's record wants the Scoreboard only to know the season.
  return { scoreboard, record: await readSeasonRecord(Promise.resolve(scoreboard)) };
});

async function scoreboardForFirstPaint(): Promise<ScoreboardReading> {
  try {
    return await readScoreboard();
  } catch (error) {
    console.error("Shell: could not read the Scoreboard", error);
    return { date: null, games: [], updatedAt: null, invalidatedAt: null, heardAt: null };
  }
}
