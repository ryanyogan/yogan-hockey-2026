# PROTOTYPE: one Agent per live game feeding a vinext page

Throwaway. Answers [issue 26](https://github.com/ryanyogan/yogan-hockey-2026/issues/26): does one Agents SDK Agent per game, polling ESPN and pushing to a vinext page through `useAgent`, work end to end?

```
pnpm install
pnpm dev
```

Open the printed URL. The home page lists ESPN's scoreboard. For each game:

- **watch live** polls the real game every 10 seconds and stops when it is final.
- **replay as if live** takes a finished game and reveals six more plays on each poll, so pushes can be seen without a game in progress.

The game page prints the Agent's whole state under the plays, including what the last ESPN fetch returned.

- `agent/game-agent.ts`: the Agent (schedule, poll, state).
- `worker.ts`: the Worker entry; `/agents/*` goes to the Agents SDK, the rest to vinext.
- `app/game/[id]/page.tsx`: server component, first paint from the Agent over RPC.
- `app/game/[id]/game-view.tsx`: client component using `useAgent`.
