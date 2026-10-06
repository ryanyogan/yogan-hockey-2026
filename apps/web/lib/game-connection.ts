/**
 * Where a game's Agent is: spread into `useAgent` in a client component, and used by `readGame`
 * for first paint. It is in a file of its own so a client component can import it without the
 * server's modules. `gameId` is ESPN's event id, the `:id` of `/nhl/games/:id`.
 */
export function gameConnection(gameId: string) {
  return { agent: "game-agent", name: gameId } as const;
}
