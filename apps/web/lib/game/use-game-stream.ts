"use client";

import {
  applyGameStreamMessage,
  type GameSnapshot,
  type GameStreamState,
  type Play,
  parseGameStreamMessage,
} from "@yogan-hockey/schemas";
import { useAgent } from "agents/react";
import { useReducer, useState } from "react";
import { gameConnection } from "../game-connection";

/** A game as its page holds it: the Game Agent's state, and every play so far in order. */
export type GameStream = GameStreamState & { plays: Play[] };

/**
 * A game page's socket to its Game Agent. It starts from the snapshot the server component read
 * (`readGame`) and from then on follows the Agent: the header, `delayed` and `archived` arrive as
 * synced state, the plays as messages put through `applyGameStreamMessage`. On connect the Agent
 * sends every play so far, so nothing that happened between first paint and the socket is missed.
 *
 * Render the component that calls this only while the game is worth a socket: the Agent polls
 * ESPN for as long as one is open. Give that component `key={gameId}`: the state here starts from
 * `initial` once and does not start again for another game.
 */
export function useGameStream(gameId: string, initial: GameSnapshot): GameStream {
  const [state, setState] = useState<GameStreamState>({
    header: initial.header,
    delayed: initial.delayed,
    archived: initial.archived,
  });
  const [plays, apply] = useReducer(applyGameStreamMessage, initial.plays);

  useAgent<GameStreamState>({
    ...gameConnection(gameId),
    onStateUpdate: setState,
    onMessage: (event) => {
      const message = parseGameStreamMessage(event.data);
      if (message) apply(message);
    },
  });

  return { ...state, plays };
}
