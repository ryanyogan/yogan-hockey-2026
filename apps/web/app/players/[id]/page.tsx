import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import {
  CareerSection,
  GameLogSection,
  PlayerHeader,
  SeasonSection,
  TeamSection,
} from "../../../components/players/player-sections";
import { careerView, gameLogView, seasonView } from "../../../lib/player-view";
import { loadPlayer } from "../../../lib/players";

export const dynamic = "force-dynamic";

/** How many games the log shows until the visitor asks for the season. */
const LATEST_GAMES = 10;

/** The title and the page ask for the same player; within one request he is loaded once. */
const playerOf = cache(loadPlayer);

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ games?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const player = await playerOf((await params).id);
  // An unknown id is titled by not-found.tsx, which the page turns to.
  return player ? { title: player.profile.name } : {};
}

/** A player: who he is, his season, his career and his latest games. `?games=all` shows them all. */
export default async function PlayerPage({ params, searchParams }: Props) {
  const [{ id }, { games }] = await Promise.all([params, searchParams]);
  const player = await playerOf(id);
  if (!player) notFound();

  const { profile } = player;
  const everyGame = games === "all";
  const season = seasonView(profile, player.career, player.gameLog);
  const career = careerView(player.career);
  const log = gameLogView(player.gameLog, everyGame ? Number.POSITIVE_INFINITY : LATEST_GAMES);
  const path = `/players/${profile.id}`;

  return (
    <>
      <PlayerHeader profile={profile} />
      {season && <SeasonSection season={season} />}
      {log && (
        <GameLogSection
          log={log}
          allHref={`${path}?games=all#games`}
          latestHref={everyGame && log.gameCount > LATEST_GAMES ? `${path}#games` : ""}
        />
      )}
      {career ? (
        <CareerSection career={career} />
      ) : (
        <p className="px-2 text-foreground/70">{profile.name} has yet to play in the NHL.</p>
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
