import type { Metadata } from "next";
import type { ReactNode } from "react";
import { FavoriteHeart } from "../../../components/favorites/favorite-heart";
import { Link } from "../../../components/link";
import { PendingOutlet } from "../../../components/pending/pending-route";
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
        action={
          <FavoriteHeart kind="player" id={profile.id} name={profile.name} className="mr-2" />
        }
      />
      {season && <SeasonSection season={season} />}
      <PendingOutlet scope="tab" className="space-y-8">
        {children}
      </PendingOutlet>
      {career ? (
        <CareerSection career={career} />
      ) : (
        <p className="px-2 text-muted-foreground">{profile.name} has yet to play in the NHL.</p>
      )}
      {profile.team && <TeamSection team={profile.team} />}
      <p className="px-2">
        <Link href="/players" className="underline">
          back to players
        </Link>
      </p>
    </>
  );
}
