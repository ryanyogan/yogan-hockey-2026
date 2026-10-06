import { env } from "cloudflare:workers";
import { getAgentByName } from "agents";
import { GameView } from "./game-view";

export const dynamic = "force-dynamic";

export default async function GamePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ replay?: string }> }) {
  const { id } = await params;
  const replay = (await searchParams).replay === "1";
  // First paint: ask the game's Agent for its current state over RPC.
  const name = replay ? `${id}-replay` : id;
  const agent = await getAgentByName((env as any).GameAgent, name);
  // RPC results carry Symbol.dispose, which React refuses to pass to a client component.
  const initial = JSON.parse(JSON.stringify(await (agent as any).watch(id, replay)));
  return (
    <main>
      <p><a href="/">all games</a></p>
      <GameView name={name} initial={initial} />
    </main>
  );
}
