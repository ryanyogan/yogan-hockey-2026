/**
 * Where the one Scoreboard Agent is: what the page's socket connects to (`lib/scoreboard-socket.ts`)
 * and what `readScoreboard` reads for first paint. It is in a file of its own so a client component can import it
 * without the server's modules.
 */
export const SCOREBOARD_CONNECTION = { agent: "scoreboard-agent", name: "main" } as const;
