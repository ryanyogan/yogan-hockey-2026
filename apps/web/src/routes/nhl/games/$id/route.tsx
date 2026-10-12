import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PageHeader } from "@yogan-hockey/ui/components/section";
import { useEffect } from "react";
import { GameMatchup } from "../../../../../components/game/game-matchup";
import { GamePage } from "../../../../../components/game/game-page";
import { GamePick } from "../../../../../components/game/game-pick";
import { Link } from "../../../../../components/link";
import { NotFoundPage } from "../../../../../components/shell/not-found-page";
import { gameHref } from "../../../../../lib/scoreboard-view";
import { type GameRead, readGameRoute } from "../../../../functions/game";
import { pageTitle, titled } from "../../../../head";

/**
 * `/nhl/games/:id`: the game, read once for the page and its tabs. The tabs beneath it
 * (`index.tsx` is the plays, `scoring.tsx` and `pick.tsx` the others) have no read of their own:
 * a tab is the same game drawn another way, so going from one to another asks the server for
 * nothing and the stream, the Replay and the rink stay as they are.
 *
 * That holds however long the page has been open: the router reads a route it is staying on
 * again only when told its read is out of date, which a final or a pick does
 * (`lib/use-refresh-on-invalidation.ts`). `src/game-routes.test.ts` keeps it to that.
 */
export const Route = createFileRoute("/nhl/games/$id")({
  loader: async ({ params: { id } }) => {
    const read = await readGameRoute({ data: { id } });
    if (read.state !== "unreadable") unread.delete(id);
    return read;
  },
  // "Could not be read just now" is not kept: coming back to the game asks again, where any
  // other read is good for five minutes (`src/router.tsx`).
  shouldReload: ({ params, cause }) => (cause !== "stay" && unread.has(params.id)) || undefined,
  head: ({ match, loaderData }) =>
    // The page of a game that does not exist has a title of its own.
    match.status === "notFound"
      ? { meta: [{ title: pageTitle("Game not found") }] }
      : titled(match, loaderData == null ? undefined : gameTitle(loaderData)),
  component: Game,
  notFoundComponent: NotFound,
});

/**
 * The games this browser has drawn as "could not be read", by id, for `shouldReload`, which is
 * not told what a route's last read was. The page that says so adds its game (the first one's
 * read was the server's, so the loader cannot), and a game leaves when it is read.
 */
const unread = new Set<string>();

function gameTitle(read: GameRead): string {
  if (read.state === "unreadable") return "Game";
  const { away, home } = read.game.header;
  return `${away.abbreviation} at ${home.abbreviation}`;
}

function Game() {
  const read = Route.useLoaderData();
  const { id } = Route.useParams();
  // An address under the game that no route answers (`/nhl/games/401803652/coaches`) is the
  // site's not-found page alone in the shell. The router draws it in this route's outlet and
  // marks the match (`_notFound`: see `src/head.ts`).
  const noSuchAddress = Route.useMatch({ select: (match) => match._notFound === true });
  if (noSuchAddress) return <Outlet />;
  const pathname = gameHref({ id });
  if (read.state === "unreadable") return <GameUnreadable id={id} pathname={pathname} />;
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
function GameUnreadable({ id, pathname }: { id: string; pathname: string }) {
  useEffect(() => void unread.add(id), [id]);
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

/**
 * Stands where the game's page would for either of two things the router sends here: a game that
 * does not exist, which this route's own read found, and an address under a game that no route
 * answers, which is the site's not-found page as anywhere else.
 */
function NotFound() {
  const noSuchGame = Route.useMatch({ select: (match) => match.status === "notFound" });
  return noSuchGame ? <GameNotFound /> : <NotFoundPage />;
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
