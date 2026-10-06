"use client";

import { useState } from "react";
import { useAgent } from "agents/react";
import type { GameState } from "../../../agent/types";

export function GameView({ name, initial }: { name: string; initial: GameState }) {
  const [state, setState] = useState(initial);
  const [pushes, setPushes] = useState(0);
  const [conn, setConn] = useState("connecting");

  useAgent<GameState>({
    agent: "game-agent",
    name,
    onStateUpdate: (s) => {
      setState(s);
      setPushes((n) => n + 1);
    },
    onOpen: () => setConn("open"),
    onClose: () => setConn("closed"),
  });

  return (
    <>
      <h1>
        {state.away.abbr} {state.away.score} @ {state.home.abbr} {state.home.score}
      </h1>
      <p>
        {state.status} | socket: {conn} | pushes received: {pushes} | polls by the Agent: {state.polls}
      </p>
      <h2>Latest plays ({state.totalPlays} so far)</h2>
      <ol style={{ paddingLeft: 0, listStyle: "none" }}>
        {state.plays.slice(0, 12).map((p) => (
          <li key={p.id} style={{ fontWeight: p.goal ? 700 : 400 }}>
            {p.period} {p.clock} [{p.type}] {p.text} {p.x !== undefined ? `(${p.x}, ${p.y})` : ""}
          </li>
        ))}
      </ol>
      <h2>Agent state (minus plays)</h2>
      <pre>{JSON.stringify({ ...state, plays: `${state.plays.length} kept` }, null, 2)}</pre>
    </>
  );
}
