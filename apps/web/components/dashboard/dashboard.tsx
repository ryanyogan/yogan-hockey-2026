import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import Link from "next/link";
import type { ReactNode } from "react";
import { topOfConferences } from "../../lib/dashboard";
import { cachedStandings } from "../../lib/espn";
import { nhlHref } from "../../lib/nhl-page";
import { familyRow, trackedPlayers } from "../../lib/tracked-players";
import { StandingsLedger } from "../nhl/standings-ledger";
import { EmptyLedger } from "../team/empty-ledger";
import { DashboardFavorites } from "./dashboard-favorites";
import { FamilyLedger } from "./family-ledger";
import { headerLink } from "./header-link";
import { TonightGames } from "./tonight-games";

const FULL_STANDINGS = nhlHref({ tab: "standings", view: "conference" });

function StandingsHeader({ of }: { of?: string }) {
  return (
    <SectionHeader title="Standings" count={of}>
      <Link href={FULL_STANDINGS} className={headerLink}>
        full standings
      </Link>
    </SectionHeader>
  );
}

/** Each conference's top eight, a table a conference, side by side on a wide page. */
async function Standings() {
  // The standings are ESPN's: when they cannot be read the block says so and the rest is drawn.
  const tables = await cachedStandings()
    .then(topOfConferences)
    .catch(() => null);
  if (tables == null || tables.length === 0) {
    return (
      <Section aria-label="Standings">
        <StandingsHeader />
        <EmptyLedger>
          {tables == null
            ? "The standings could not be read just now."
            : "No standings yet this season."}
        </EmptyLedger>
      </Section>
    );
  }
  return tables.map((table) => (
    <StandingsLedger
      key={table.title}
      compact
      table={table}
      header={<StandingsHeader of={table.title.toLowerCase()} />}
    />
  ));
}

/**
 * The dashboard, the Reference UI's "Tonight ledger": tonight's games across the page, then
 * Family, Favorites and the standings two to a row. Family and the standings are the server's;
 * the games and the favorite players are the browser's (the socket and `localStorage`).
 *
 * `picks` and `record` are the pick of each game and the season record of the picks, which
 * `TonightGames` draws and describes. Both are left out until there are picks to show.
 */
export function Dashboard({
  picks,
  record,
}: {
  picks?: Readonly<Record<string, ReactNode>>;
  record?: ReactNode;
}) {
  return (
    <>
      <TonightGames picks={picks} record={record} />
      {/* `grid-cols-1`: a column no wider than the page, whatever a ledger in it would like. */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <FamilyLedger rows={trackedPlayers().map(familyRow)} />
        <DashboardFavorites />
        <Standings />
      </div>
    </>
  );
}
