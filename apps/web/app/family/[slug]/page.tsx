import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrackedPlayerView } from "../../../components/family/tracked-player-view";
import { trackedPlayer, trackedTabFrom } from "../../../lib/tracked-players";

/*
 * A Tracked Player's page. Rendered per request like every page (spec §2), and from nothing but
 * his static file: no ESPN read, no store, no cache tag. `?tab=schedule` opens the Schedule tab.
 */
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const player = trackedPlayer((await params).slug);
  // An unknown slug is titled by the not-found page the page turns to.
  return player ? { title: player.name } : {};
}

export default async function TrackedPlayerPage({ params, searchParams }: Props) {
  const [{ slug }, { tab }] = await Promise.all([params, searchParams]);
  const player = trackedPlayer(slug);
  if (!player) notFound();
  return <TrackedPlayerView player={player} tab={trackedTabFrom(tab)} />;
}
