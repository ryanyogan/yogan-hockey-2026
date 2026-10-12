import type { Metadata } from "next";
import type { ReactNode } from "react";
import { FavoriteHeart } from "../../../components/favorites/favorite-heart";
import { Link } from "../../../components/link";
import {
  CareerSection,
  PlayerHeader,
  SeasonSection,
  TeamSection,
} from "../../../components/players/player-sections";
import { playerOf } from "../../../lib/player-route";
import { careerView, seasonView } from "../../../lib/player-view";
import { doNotKeepPage } from "../../../lib/render-failure";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  children: ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const player = await playerOf((await params).id);
  // An unknown id is titled by not-found.tsx, which the page turns to.
  return player ? { title: player.profile.name } : {};
}

/** A player: who he is, his season, his career and his latest games. `?games=all` shows them all. */
export default async function PlayerLayout({ params, children }: Props) {
  const { id } = await params;
  // The leaf reports errors inside the shell; a failed layout must not throw above it.
  const player = await playerOf(id).catch(() => {
    doNotKeepPage();
    return null;
  });
  if (!player) return children;

  const { profile } = player;
  const season = seasonView(profile, player.career, player.gameLog);
  const career = careerView(player.career);

  return (
    <>
      <PlayerHeader
        profile={profile}
        action={<FavoriteHeart kind="player" id={profile.id} name={profile.name} />}
      />
      {season && <SeasonSection season={season} />}
      {children}
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
