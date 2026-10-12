/**
 * Where a game's Agent is: spread into `useAgent` in the browser, and used by `readGame`
 * for first paint. It is in a file of its own so a component can import it without the
 * server's modules. `gameId` is ESPN's event id, the `:id` of `/nhl/games/:id`.
 */
export function gameConnection(gameId: string) {
  return { agent: "game-agent", name: gameId } as const;
}
