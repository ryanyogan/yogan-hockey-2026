/**
 * Where the one Scoreboard Agent is: spread into `useAgent` in a client component, and used by
 * `readScoreboard` for first paint. It is in a file of its own so a client component can import it
 * without the server's modules.
 */
export const SCOREBOARD_CONNECTION = { agent: "scoreboard-agent", name: "main" } as const;
