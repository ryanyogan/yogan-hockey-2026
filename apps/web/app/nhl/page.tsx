import { type StandingsView, standingsView } from "@yogan-hockey/schemas";
import { SectionHeader } from "@yogan-hockey/ui/components/section";
import { UrlTabs } from "@yogan-hockey/ui/components/url-tabs";
import type { Metadata } from "next";
import { Link } from "../../components/link";
import { StandingsLedger } from "../../components/nhl/standings-ledger";
import { TeamsLedger } from "../../components/nhl/teams-ledger";
import { cachedStandings, cachedTeams } from "../../lib/espn";
import { NHL_TABS, nhlHref, type Query, readNhlPage, STANDINGS_VIEWS } from "../../lib/nhl-page";
import { tablesByConference } from "../../lib/standings-table";

// Rendered per request; the ESPN reads behind it are cached and tagged (spec §2).
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Query> };

const VIEW_LABELS: Record<StandingsView, string> = {
  division: "division",
  conference: "conference",
  wildcard: "wild card",
  league: "league",
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { tab } = readNhlPage(await searchParams);
  return { title: tab === "teams" ? "NHL teams" : "NHL standings" };
}

export default async function NhlPage({ searchParams }: Props) {
  const page = readNhlPage(await searchParams);

  return (
    <>
      <div className="space-y-2">
        <SectionHeader title="NHL" className="mb-0">
          <UrlTabs
            label="NHL"
            link={Link}
            current={page.tab}
            tabs={NHL_TABS.map((tab) => ({
              value: tab,
              label: tab,
              href: nhlHref({ ...page, tab }),
            }))}
          />
        </SectionHeader>
        {page.tab === "standings" && (
          <UrlTabs
            label="Standings view"
            link={Link}
            current={page.view}
            tabs={STANDINGS_VIEWS.map((view) => ({
              value: view,
              label: VIEW_LABELS[view],
              href: nhlHref({ ...page, view }),
            }))}
          />
        )}
      </div>
      {page.tab === "teams" ? <Teams /> : <Standings view={page.view} />}
    </>
  );
}

async function Teams() {
  return <TeamsLedger teams={await cachedTeams()} />;
}

async function Standings({ view }: { view: StandingsView }) {
  const columns = tablesByConference(standingsView(await cachedStandings(), view));
  return (
    // One column per conference from `xl` up. The league table, alone, keeps to the first column:
    // a row twice as wide puts a team too far from its figures to read across.
    <div className="grid gap-8 xl:grid-cols-2">
      {columns.map((tables) => (
        <div key={tables[0]?.conference} className="space-y-8">
          {tables.map((table) => (
            <StandingsLedger key={table.title} table={table} />
          ))}
        </div>
      ))}
    </div>
  );
}
