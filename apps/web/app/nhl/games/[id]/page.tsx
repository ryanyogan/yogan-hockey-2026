import type { GameHeader } from "@yogan-hockey/schemas";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { GameMatchup } from "../../../../components/game/game-matchup";
import { GamePage } from "../../../../components/game/game-page";
import { GamePick } from "../../../../components/game/game-pick";
import { cachedGamePregame } from "../../../../lib/espn";
import { findGame } from "../../../../lib/find-game";
import { gamePhase } from "../../../../lib/game/page-state";
import { gameTabFrom } from "../../../../lib/game/tabs";
import { gameHref } from "../../../../lib/scoreboard-view";

// Rendered per request: first paint is the Game Agent's answer as it is now.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
};

// The title and the page both want the game: one read of its Agent for the two of them.
const loadGame = cache(findGame);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const game = await loadGame((await params).id);
  // A missing game's title is `not-found.tsx`'s; this one is never shown.
  if (game == null) return { title: "Game not found" };
  return { title: `${game.header.away.abbreviation} at ${game.header.home.abbreviation}` };
}

/** The matchup facts, which only a game still to come shows. They never take the page down. */
async function Matchup({ header }: { header: GameHeader }) {
  try {
    return <GameMatchup header={header} pregame={await cachedGamePregame(header.id)} />;
  } catch (error) {
    console.error(`Game ${header.id}: the matchup could not be read`, error);
    return null;
  }
}

export default async function GameRoute({ params, searchParams }: Props) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  const game = await loadGame(id);
  if (game == null) notFound();

  // The Replay (#51) starts here for a game already over: when `game.archived` is false, call
  // `archiveGame(id)` (lib/game.ts), then read the plays from D1 and hand them to `GamePage` in
  // place of the snapshot's. `FinishedGame` is the component that draws them.
  const scheduled = gamePhase(game.header.status) === "scheduled";

  return (
    <GamePage
      key={id}
      gameId={id}
      game={game}
      tab={gameTabFrom(tab)}
      pathname={gameHref({ id })}
      matchup={scheduled ? <Matchup header={game.header} /> : null}
      pick={<GamePick gameId={id} header={game.header} />}
    />
  );
}
