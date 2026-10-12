import { createFileRoute } from "@tanstack/react-router";
import type { StandingsTable, StandingsView } from "@yogan-hockey/schemas";
import { PageHeader } from "@yogan-hockey/ui/components/section";
import { UrlTabs } from "@yogan-hockey/ui/components/url-tabs";
import { Link } from "../../../components/link";
import { StandingsLedger } from "../../../components/nhl/standings-ledger";
import { TeamsList } from "../../../components/nhl/teams-list";
import { NHL_TABS, nhlHref, readNhlPage, STANDINGS_VIEWS } from "../../../lib/nhl-page";
import { readNhl } from "../../functions/nhl";
import { titled } from "../../head";

/** `/nhl`: the standings in one of four views, or the list of teams, by `?tab=` and `?view=`. */
export const Route = createFileRoute("/nhl/")({
  // Anything unknown in the query falls back to the default, so the page is always one of these.
  loaderDeps: ({ search }) => readNhlPage(search),
  loader: ({ deps }) => readNhl({ data: deps }),
  head: ({ loaderData }) => titled(loaderData?.tab === "teams" ? "NHL teams" : "NHL standings"),
  component: NhlPage,
});

const VIEW_LABELS: Record<StandingsView, string> = {
  division: "division",
  conference: "conference",
  wildcard: "wild card",
  league: "league",
};

function NhlPage() {
  // What is drawn is what was read: while another tab's read is on its way this one stays whole.
  const read = Route.useLoaderData();
  const page = { tab: read.tab, view: read.view };

  return (
    <>
      <div>
        {/* The page is named for its tab, as the masthead names the two places. */}
        <PageHeader
          title={page.tab === "teams" ? "Teams" : "Standings"}
          count={page.tab === "teams" ? undefined : `by ${VIEW_LABELS[page.view]}`}
        />
        {/* On a phone each set of tabs is a strip the page's width, one under the other. */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 max-md:mt-3">
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
          {page.tab === "standings" && (
            <UrlTabs
              label="Standings view"
              // Four views in a phone's width: each cell gives up most of its padding and more than
              // half its tracking (.05em for .12em), or the last is off the edge of a strip nobody knows to scroll. They fit
              // a 360px phone with 18px over.
              className="max-md:[&>a]:px-1 max-md:[&>a]:tracking-wider"
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
      </div>
      {read.tab === "teams" ? (
        <TeamsList teams={read.teams} />
      ) : (
        <Standings columns={read.columns} />
      )}
    </>
  );
}

function Standings({ columns }: { columns: StandingsTable[][] }) {
  return (
    // One column per conference from `xl` up. The league table, alone, keeps to the first column:
    // a row twice as wide puts a team too far from its figures to read across.
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
      {columns.map((tables) => (
        <div key={tables[0]?.conference} className="space-y-6">
          {tables.map((table) => (
            <StandingsLedger key={table.title} table={table} />
          ))}
        </div>
      ))}
    </div>
  );
}
