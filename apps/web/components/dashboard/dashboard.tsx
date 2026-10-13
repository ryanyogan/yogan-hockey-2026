import type { News, Piece, SeasonRecord, StandingsTable } from "@yogan-hockey/schemas";
import { useId } from "react";
import { agateName, noStandings } from "../../lib/agate-copy";
import { nhlHref } from "../../lib/nhl-page";
import { Link } from "../link";
import { frontPage, link, sectionHead, sectionKicker, sectionTitle, table } from "./front";
import { HomeNews } from "./news";
import { Glance, PicksBox } from "./picks-and-tonight";
import { HomePieces } from "./pieces";
import { type Picks, Roundup } from "./roundup";

const FULL_STANDINGS = nhlHref({ tab: "standings", view: "conference" });

const COLUMNS = ["GP", "W", "L", "OT", "PTS"];

/**
 * One conference in agate, under its name in small capitals: the club by its agate name, then GP,
 * W, L, OT and the points in bold. `first` is the one under the section's head, which sits closer
 * to it than the next does to the table above.
 */
function ConferenceStandings({
  table: standings,
  first,
}: {
  table: StandingsTable;
  first: boolean;
}) {
  const id = useId();
  const conference = / Conference$/;
  const figure = `${table.cell} text-right`;
  return (
    <div data-slot="conference">
      <h3
        id={id}
        className={`pb-[6px] font-agate font-label text-[12px] uppercase leading-[1.35] tracking-[0.12em] ${first ? "pt-[14px]" : "pt-[22px]"}`}
      >
        {/* "Eastern" to the eye, as a paper heads it; the table's name is the whole of it. */}
        {standings.title.replace(conference, "")}
        {conference.test(standings.title) && <span className="sr-only"> Conference</span>}
      </h3>
      <table aria-labelledby={id} className={table.table}>
        <thead>
          <tr className={table.head}>
            <th scope="col" className={`${table.column} ${table.quiet} text-left`}>
              Team
            </th>
            {COLUMNS.map((column) => (
              <th
                key={column}
                scope="col"
                className={`${table.column} w-[13%] text-right ${column === "PTS" ? table.key : table.quiet}`}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {standings.rows.map(({ team, gamesPlayed, wins, losses, otLosses, points }) => (
            <tr key={team.id} className={table.row}>
              <td className={`${table.cell} text-left`}>
                {/*
                  A link from `md` up only. A phone's rows are 32px apart, which is less than a
                  thumb: there the way to a team is "Full standings".
                */}
                <Link
                  href={`/nhl/teams/${team.id}`}
                  className={`${link} hover:text-kicker max-md:hidden`}
                >
                  {agateName(team)}
                </Link>
                <span className="md:hidden">{agateName(team)}</span>
              </td>
              <td className={figure}>{gamesPlayed}</td>
              <td className={figure}>{wins}</td>
              <td className={figure}>{losses}</td>
              <td className={figure}>{otLosses}</td>
              <td className={`${figure} font-label`}>{points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Each conference's top eight, one table over the other, under a serif title with the way to the
 * rest. The standings are ESPN's: when they could not be read (`tables` null) the block says so
 * and the rest is drawn.
 *
 * Beside the headlines from `md` up, a hairline between; under them on a phone, a hairline over.
 */
function Standings({ tables }: { tables: StandingsTable[] | null }) {
  return (
    <section
      aria-labelledby="standings-heading"
      data-slot="standings"
      className="flex min-w-0 flex-col border-hairline max-md:mt-7 max-md:border-t max-md:pt-7 md:col-span-5 md:border-l md:pl-8"
    >
      <div className={`${sectionHead} justify-between`}>
        <h2 id="standings-heading" className={sectionTitle}>
          Standings
        </h2>
        <Link
          href={FULL_STANDINGS}
          className={`${link} ${sectionKicker} tap-target whitespace-nowrap hover:text-kicker`}
        >
          Full standings <span aria-hidden="true">→</span>
        </Link>
      </div>
      {tables == null || tables.length === 0 ? (
        <p data-slot="no-standings" className="pt-[14px]">
          {noStandings(tables != null)}
        </p>
      ) : (
        tables.map((each, index) => (
          <ConferenceStandings key={each.title} table={each} first={index === 0} />
        ))
      )}
    </section>
  );
}

/**
 * Home as a broadsheet's front page (#240, `docs/design/front-page`): the roundup's leads as
 * three ruled columns, the briefs and the written pieces, then ESPN's headlines with The Picks
 * and tonight at a glance under them, beside the standings. On a phone it is one column in that
 * order. Nothing is boxed or filled: `./front.ts` says which rule is which.
 *
 * The route hands in what its loader read: `picks`, the made picks of today's games by game id,
 * `record`, the season's, and `standings`, each conference's top eight (`topOfConferences`), or
 * null when they could not be read, `pieces`, the written pieces of the day, and `news`, ESPN's
 * headlines: either is null when there are none to show, which leaves its section out. The games
 * are the Scoreboard's.
 */
export function Dashboard({
  picks = {},
  record = null,
  standings,
  pieces = null,
  news = null,
}: {
  picks?: Picks;
  record?: SeasonRecord | null;
  standings: StandingsTable[] | null;
  pieces?: Piece[] | null;
  news?: News | null;
}) {
  return (
    // One child of the shell's `<main>`, which would space several by its own measure. The
    // roundup's head has its own 26px above it, so the shell's room over a page is taken back.
    <div data-slot="home" className={`${frontPage} -mt-[22px] md:-mt-7`}>
      <Roundup picks={picks} />
      <HomePieces pieces={pieces} />
      <div data-slot="below-the-fold" className="grid pt-7 md:grid-cols-12 md:gap-x-8">
        <div className="flex min-w-0 flex-col gap-7 md:col-span-7">
          <HomeNews news={news} />
          <div data-slot="picks-and-tonight" className="grid gap-7 md:grid-cols-2 md:gap-8">
            <PicksBox picks={picks} record={record} />
            <Glance />
          </div>
        </div>
        <Standings tables={standings} />
      </div>
    </div>
  );
}
