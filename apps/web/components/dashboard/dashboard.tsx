import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import type { ReactNode } from "react";
import { topOfConferences } from "../../lib/dashboard";
import { cachedStandings } from "../../lib/espn";
import { nhlHref } from "../../lib/nhl-page";
import { doNotKeepPage } from "../../lib/render-failure";
import { Link } from "../link";
import { StandingsLedger } from "../nhl/standings-ledger";
import { EmptyLedger } from "../team/empty-ledger";
import { DashboardFavorites } from "./dashboard-favorites";
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

/** Each conference's top eight, in the dashboard's responsive standings column. */
async function Standings() {
  // The standings are ESPN's: when they cannot be read the block says so and the rest is drawn.
  const tables = await cachedStandings()
    .then(topOfConferences)
    .catch(() => {
      // Should the dashboard come to be kept in the page cache, not with this in it.
      doNotKeepPage();
      return null;
    });
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

/** Tonight and favorites beside the conference standings, stacked on a phone. */
export function Dashboard({
  picks,
  record,
}: {
  picks?: Readonly<Record<string, ReactNode>>;
  record?: ReactNode;
}) {
  return (
    <>
      <div className="page-heading">
        <h1>Games</h1>
        <p>NHL</p>
      </div>
      <div className="dashboard-grid">
        <div className="dashboard-stack">
          <TonightGames picks={picks} record={record} />
          <DashboardFavorites />
        </div>
        <div className="dashboard-stack dashboard-standings">
          <Standings />
        </div>
      </div>
    </>
  );
}
