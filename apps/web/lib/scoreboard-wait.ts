/**
 * How long a page served from the page cache holds the places of today's games for the
 * Scoreboard's socket. The socket's first message usually arrives well inside a second; four
 * seconds is the wait a dropped socket is given before the page says so (`DROP_WAIT_MS`).
 */
export const SCOREBOARD_WAIT_MS = 4000;

/**
 * Waits for the Scoreboard's socket to speak, and calls `giveUp` once if it has not within
 * `SCOREBOARD_WAIT_MS`: the page then draws what it knows without today's games (a team's next
 * game from its schedule), where it would otherwise show placeholders for as long as the socket
 * stayed silent. Call `heard` when the socket speaks and `stop` when the page goes.
 */
export function waitForScoreboard(giveUp: () => void): { heard(): void; stop(): void } {
  const timer = setTimeout(giveUp, SCOREBOARD_WAIT_MS);
  const stop = () => clearTimeout(timer);
  return { heard: stop, stop };
}
