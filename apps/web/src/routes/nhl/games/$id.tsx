import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PageHeader } from "@yogan-hockey/ui/components/section";
import { GameMatchup } from "../../../../components/game/game-matchup";
import { GamePage } from "../../../../components/game/game-page";
import { GamePick } from "../../../../components/game/game-pick";
import { Link } from "../../../../components/link";
import { gameHref } from "../../../../lib/scoreboard-view";
import { type GameRead, readGameRoute } from "../../../functions/game";
import { pageTitle, titled } from "../../../head";

/**
 * `/nhl/games/:id`: the game, read once for the page and its tabs. The tabs beneath it (the
 * plays, `scoring`, `pick`) have no read of their own, so going from one to another asks for
 * nothing and the stream, the Replay and the rink stay as they are.
 */
export const Route = createFileRoute("/nhl/games/$id")({
  loader: ({ params }) => readGameRoute({ data: { id: params.id } }),
  head: ({ match, loaderData }) =>
    // The page of a game that does not exist has a title of its own.
    loaderData == null && match.status === "notFound"
      ? { meta: [{ title: pageTitle("Game not found") }] }
      : titled(match, loaderData == null ? undefined : gameTitle(loaderData)),
  component: Game,
  notFoundComponent: GameNotFound,
});

function gameTitle(read: GameRead): string {
  if (read.state === "unreadable") return "Game";
  const { away, home } = read.game.header;
  return `${away.abbreviation} at ${home.abbreviation}`;
}

function Game() {
  const read = Route.useLoaderData();
  const { id } = Route.useParams();
  const pathname = gameHref({ id });
  if (read.state === "unreadable") return <GameUnreadable pathname={pathname} />;
  const { game, pick, pregame } = read;

  return (
    <>
      <GamePage
        key={id}
        gameId={id}
        game={game}
        pathname={pathname}
        matchup={pregame == null ? null : <GameMatchup header={game.header} pregame={pregame} />}
        pick={
          pick.state === "made" ? (
            <GamePick prediction={pick.prediction} header={game.header} final={pick.final} />
          ) : null
        }
        pickPending={pick.state === "pending"}
      />
      <Outlet />
    </>
  );
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

/** An id that is no NHL game's: the same shell, and a way back to the scores. */
function GameNotFound() {
  return (
    <section data-slot="not-found">
      <PageHeader title="Game not found" count="404" />
      <p className="pt-3 font-serif text-prose text-note leading-[1.4]">
        No game is kept at this address.{" "}
        <Link href="/nhl/live" className="tap-target font-strong underline">
          Live scores
        </Link>
      </p>
    </section>
  );
}
