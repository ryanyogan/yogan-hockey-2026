import type { GameHeader } from "@yogan-hockey/schemas";
import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { GameMatchup } from "../../../../components/game/game-matchup";
import { GamePage } from "../../../../components/game/game-page";
import { GamePick } from "../../../../components/game/game-pick";
import { cachedGamePregame } from "../../../../lib/espn";
import { findGame } from "../../../../lib/find-game";
import { gamePhase } from "../../../../lib/game/page-state";
import { gameTabFrom } from "../../../../lib/game/tabs";
import { readGamePick } from "../../../../lib/game-pick";
import { replayGame } from "../../../../lib/replay";
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
  const found = await loadGame((await params).id);
  // A missing game's title is `not-found.tsx`'s; this one is never shown.
  if (found.state === "missing") return { title: "Game not found" };
  if (found.state === "unreadable") return { title: "Game" };
  const { away, home } = found.game.header;
  return { title: `${away.abbreviation} at ${home.abbreviation}` };
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

/**
 * A game that could not be read just now: ESPN did not answer for a game its Agent has never
 * seen, or the Agent could not be reached. It is not "not found", and nothing is remembered: the
 * next request asks ESPN again.
 */
function GameUnreadable({ pathname }: { pathname: string }) {
  return (
    <Section data-slot="game-unreadable">
      <SectionHeader title="Game" />
      <p className="border-foreground/20 border-t px-2 py-1.5">
        This game could not be read just now.{" "}
        {/* A plain link: the page is rendered again from nothing, which is the retry. */}
        <a href={pathname} className="font-bold underline">
          Try again
        </a>{" "}
        or see the{" "}
        <Link href="/nhl/live" className="font-bold underline">
          live scores
        </Link>
        .
      </p>
    </Section>
  );
}

export default async function GameRoute({ params, searchParams }: Props) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  const found = await loadGame(id);
  if (found.state === "missing") notFound();
  if (found.state === "unreadable") return <GameUnreadable pathname={gameHref({ id })} />;

  // A game already over is the Replay, which draws D1's plays: a game nobody watched is archived
  // here, on its first open, and every later open is one read of D1.
  const game = await replayGame(found.game);
  const scheduled = gamePhase(game.header.status) === "scheduled";
  // After `replayGame`, which writes a finished game nobody watched: its D1 row marks the pick.
  const pick = await readGamePick(game.header);

  return (
    <GamePage
      key={id}
      gameId={id}
      game={game}
      tab={gameTabFrom(tab)}
      pathname={gameHref({ id })}
      matchup={scheduled ? <Matchup header={game.header} /> : null}
      pick={
        pick.state === "made" ? (
          <GamePick prediction={pick.prediction} header={game.header} final={pick.final} />
        ) : null
      }
      pickPending={pick.state === "pending"}
    />
  );
}
