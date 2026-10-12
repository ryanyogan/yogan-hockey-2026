import type { GameHeader } from "@yogan-hockey/schemas";
import { PageHeader } from "@yogan-hockey/ui/components/section";
import type { Metadata } from "next";
import { type ReactNode, Suspense } from "react";
import { GameMatchup } from "../../../../components/game/game-matchup";
import { GamePage } from "../../../../components/game/game-page";
import { GamePick } from "../../../../components/game/game-pick";
import { Link } from "../../../../components/link";
import { GameSkeleton } from "../../../../components/route-skeletons";
import { cachedGamePregame } from "../../../../lib/espn";
import { gamePhase } from "../../../../lib/game/page-state";
import { readGamePick } from "../../../../lib/game-pick";
import { loadGame } from "../../../../lib/game-route";
import { doNotKeepPage } from "../../../../lib/render-failure";
import { replayGame } from "../../../../lib/replay";
import { gameHref } from "../../../../lib/scoreboard-view";

// Rendered per request: first paint is the Game Agent's answer as it is now. The page cache keeps
// the page of a game that is over and archived, and of no other (`doNotKeepPage()` below).
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  children: ReactNode;
};

// The title and the page both want the game: one read of its Agent for the two of them.

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
    <section data-slot="game-unreadable">
      <PageHeader title="Game" count="not read" />
      <p className="pt-3 font-serif text-prose text-note leading-[1.4]">
        This game could not be read just now.{" "}
        {/* A plain link: the page is rendered again from nothing, which is the retry. */}
        <a href={pathname} className="tap-target font-strong underline">
          Try again
        </a>{" "}
        or see the{" "}
        <Link href="/nhl/live" className="tap-target font-strong underline">
          live scores
        </Link>
        .
      </p>
    </section>
  );
}

async function GameContent({ id }: { id: string }) {
  const found = await loadGame(id);
  if (found.state === "missing") return null;
  if (found.state === "unreadable") {
    doNotKeepPage();
    return <GameUnreadable pathname={gameHref({ id })} />;
  }
  // A game already over is the Replay, which draws D1's plays: a game nobody watched is archived
  // here, on its first open, and every later open is one read of D1.
  const game = await replayGame(found.game);
  const phase = gamePhase(game.header.status);
  const scheduled = phase === "scheduled";
  // Only a game that is over, drawn from D1's plays, is the same page for the next visitor.
  if (phase !== "finished" || !game.archived) doNotKeepPage();
  // After `replayGame`, which writes a finished game nobody watched: its D1 row marks the pick.
  const pick = await readGamePick(game.header);

  return (
    <GamePage
      key={id}
      gameId={id}
      game={game}
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

/** The stream, replay and rink remain mounted while only the nested tab address changes. */
export default async function GameLayout({ params, children }: Props) {
  const { id } = await params;
  return (
    <>
      <Suspense fallback={<GameSkeleton />}>
        <GameContent id={id} />
      </Suspense>
      {children}
    </>
  );
}
