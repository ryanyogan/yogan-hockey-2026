import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import type { Metadata } from "next";
import Link from "next/link";
import { findPlayers } from "../../lib/players";
import { FavoritePlayers } from "./favorite-players";
import { PlayerSearch } from "./player-search";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Players" };

/** Player search and the visitor's favorite players. `?q=` holds the search. */
export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q } = await searchParams;
  const search = await findPlayers(typeof q === "string" ? q : "");

  return (
    <>
      <Section>
        <SectionHeader title="Players" count="search the NHL">
          <Link href="/nhl?tab=teams" className="underline">
            or browse a team's roster
          </Link>
        </SectionHeader>
        {/* A new key with every render of the page, so arriving by a link (the sidebar, Back)
            starts the box from this URL. Typing renders nothing here: it calls the action and
            rewrites the address, so the box keeps its place while it is typed in. */}
        <PlayerSearch key={crypto.randomUUID()} initial={search} />
      </Section>
      <FavoritePlayers />
    </>
  );
}
