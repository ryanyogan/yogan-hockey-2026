import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Link } from "../../../../components/link";
import { PlayerNotFound } from "../../../../components/players/player-not-found";
import {
  CareerSection,
  PlayerHeader,
  SeasonSection,
  TeamSection,
} from "../../../../components/players/player-sections";
import { readPlayer } from "../../../functions/players";
import { titled } from "../../../head";

/**
 * A player: who he is, his season, his career and his team, around the games of whichever tab is
 * open (`index.tsx`, `games.tsx`). This route reads him, once for both tabs: going between them
 * reads nothing.
 */
export const Route = createFileRoute("/players/$id")({
  loader: ({ params }) => readPlayer({ data: { id: params.id } }),
  // An id that is nobody's is titled by its own not-found page.
  head: ({ match, loaderData }) => titled(match, loaderData?.profile.name, "Player not found"),
  component: PlayerPage,
  notFoundComponent: PlayerNotFound,
});

function PlayerPage() {
  const { profile, season, career } = Route.useLoaderData();
  return (
    <>
      <PlayerHeader profile={profile} />
      {season && <SeasonSection season={season} />}
      <Outlet />
      {career ? (
        <CareerSection career={career} />
      ) : (
        <p className="font-serif text-prose text-note leading-[1.4]">
          {profile.name} has yet to play in the NHL.
        </p>
      )}
      {profile.team && <TeamSection team={profile.team} />}
      <p className="font-label text-small uppercase tracking-head">
        <Link href="/players" className="tap-target hover:underline">
          Back to players
        </Link>
      </p>
    </>
  );
}
