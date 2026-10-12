import type { SeasonRecord, StandingsTable } from "@yogan-hockey/schemas";
import {
  Ledger,
  LedgerBody,
  LedgerCell,
  LedgerColumn,
  LedgerHead,
  LedgerRow,
} from "@yogan-hockey/ui/components/ledger";
import { useId } from "react";
import { agateName } from "../../lib/agate-copy";
import { topOfConferences } from "../../lib/dashboard";
import { cachedStandings } from "../../lib/espn";
import { nhlHref } from "../../lib/nhl-page";
import { doNotKeepPage } from "../../lib/render-failure";
import { Link } from "../link";
import { agate, link, more, ruledLabel } from "./agate";
import { DashboardFavorites } from "./dashboard-favorites";
import { Conferences, Glance, PicksBox } from "./lower-band";
import { type Picks, Roundup } from "./roundup";

const FULL_STANDINGS = nhlHref({ tab: "standings", view: "conference" });

const COLUMNS = ["GP", "W", "L", "OT", "PTS"];

/** One conference in agate: the club by its agate name, then GP, W, L, OT and the points in bold. */
function ConferenceStandings({ table }: { table: StandingsTable }) {
  const id = useId();
  // A phone's table is the only thing under the control: an ink rule under its head.
  const head = `${agate.head} max-md:border-rule`;
  const figure = `${agate.cell} ${agate.figure}`;
  return (
    <>
      <h3 id={id} className={`${ruledLabel} max-md:hidden`}>
        {table.title}
      </h3>
      <Ledger aria-labelledby={id}>
        <LedgerHead>
          <LedgerColumn className={head}>Team</LedgerColumn>
          {COLUMNS.map((column) => (
            <LedgerColumn key={column} numeric className={`${head} ${agate.figure}`}>
              {column}
            </LedgerColumn>
          ))}
        </LedgerHead>
        <LedgerBody>
          {table.rows.map(({ team, gamesPlayed, wins, losses, otLosses, points }) => (
            <LedgerRow key={team.id} className={agate.row}>
              <LedgerCell className={`${agate.cell} text-left`}>
                {/*
                  A link from `md` up only. A phone's rows are 40px apart, as drawn, which is
                  less than a thumb: there the way to a team is "Full standings".
                */}
                <Link
                  href={`/nhl/teams/${team.id}`}
                  className={`${link} hover:underline max-md:hidden`}
                >
                  {agateName(team)}
                </Link>
                <span className="md:hidden">{agateName(team)}</span>
              </LedgerCell>
              <LedgerCell numeric tone="aside" className={figure}>
                {gamesPlayed}
              </LedgerCell>
              <LedgerCell numeric className={figure}>
                {wins}
              </LedgerCell>
              <LedgerCell numeric className={figure}>
                {losses}
              </LedgerCell>
              <LedgerCell numeric className={figure}>
                {otLosses}
              </LedgerCell>
              <LedgerCell numeric tone="strong" className={figure}>
                {points}
              </LedgerCell>
            </LedgerRow>
          ))}
        </LedgerBody>
      </Ledger>
    </>
  );
}

/** Each conference's top eight under a serif title, with the way to the rest. */
async function Standings() {
  // The standings are ESPN's: when they cannot be read the block says so and the rest is drawn.
  const tables = await cachedStandings()
    .then(topOfConferences)
    .catch(() => {
      // Should Home come to be kept in the page cache, not with this in it.
      doNotKeepPage();
      return null;
    });
  return (
    <section
      aria-labelledby="standings-heading"
      data-slot="standings"
      className="min-w-0 flex-[999_1_560px] max-md:order-2 max-md:flex-none max-md:border-rule max-md:border-t-[3px] max-md:pt-3"
    >
      <div className="mb-[14px] flex items-baseline justify-between gap-3 max-md:mb-0">
        <h2
          id="standings-heading"
          className="font-serif font-strong text-title normal-nums tracking-[-0.01em]"
        >
          Standings
        </h2>
        <Link href={FULL_STANDINGS} className={more}>
          Full standings
        </Link>
      </div>
      {tables == null || tables.length === 0 ? (
        <p className="font-serif text-note text-prose normal-nums">
          {tables == null
            ? "The standings could not be read just now."
            : "No standings yet this season."}
        </p>
      ) : (
        <Conferences
          conferences={tables.map((table) => ({
            name: table.title,
            // "Eastern Conference" is "Eastern" on the phone's control.
            short: table.title.replace(/ Conference$/, ""),
            table: <ConferenceStandings table={table} />,
          }))}
        />
      )}
    </section>
  );
}

/**
 * Home (`docs/design/agate.md` § Page anatomy): the roundup's leads and briefs, then, under a
 * heavy rule, the standings beside The Picks, tonight at a glance and the favorites. On a phone
 * the lower band is one column in another order: the picks, the standings, the favorites.
 *
 * The page hands in what D1 holds: `picks`, the made picks of today's games by game id, and
 * `record`, the season's. Everything that follows the Scoreboard is a client component inside.
 */
export function Dashboard({
  picks = {},
  record = null,
}: {
  picks?: Picks;
  record?: SeasonRecord | null;
}) {
  return (
    // One child of the shell's `<main>`, which would space several by its own measure.
    <div data-slot="home">
      <Roundup picks={picks} />
      <div
        data-slot="lower-band"
        className="mt-11 flex flex-wrap gap-10 border-rule border-t-[3px] pt-4 max-md:mt-8 max-md:flex-col max-md:gap-8 max-md:border-t-0 max-md:pt-0"
      >
        <Standings />
        {/* On a phone its three parts are the column's own, in the column's order. */}
        <aside
          aria-label="Picks and favorites"
          className="flex min-w-0 flex-[1_1_300px] flex-col gap-7 max-md:contents"
        >
          <PicksBox picks={picks} record={record} />
          <Glance />
          <DashboardFavorites />
        </aside>
      </div>
    </div>
  );
}
