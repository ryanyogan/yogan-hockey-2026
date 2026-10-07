import type { Metadata } from "next";
import { TrackedPlayerView } from "../../../components/family/tracked-player-view";
import { pageNotFound } from "../../../lib/page-not-found";
import { trackedPlayer, trackedTabFrom } from "../../../lib/tracked-players";

/*
 * A Tracked Player's page, kept in the page cache (spec §2): drawn from nothing but his static
 * file and its address. No ESPN read, no store, no cache tag, and no date: the browser leaves a
 * past game out of Upcoming. `?tab=schedule` opens the Schedule tab.
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
  if (!player) pageNotFound();
  return <TrackedPlayerView player={player} tab={trackedTabFrom(tab)} />;
}
