import {
  Ledger,
  LedgerAside,
  LedgerBody,
  LedgerCell,
  LedgerColumn,
  LedgerHead,
  LedgerRow,
  ledgerRowLink,
} from "@yogan-hockey/ui/components/ledger";
import { LiveMarker } from "@yogan-hockey/ui/components/marker";
import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import { gameHref } from "../../lib/scoreboard-view";
import type { ResultRow, ScheduleRow } from "../../lib/team-schedule";
import { Link } from "../link";
import { LocalTime } from "../local-time";
import { TeamName } from "../nhl/team-name";
import { EmptyLedger } from "./empty-ledger";
import { Versus } from "./versus";

const games = (count: number) => (count === 1 ? "1 game" : `${count} games`);

/** A link to the other half of the schedule, for a phone, where the two are one long column. */
function Jump({ to, children }: { to: string; children: string }) {
  return (
    <a href={`#${to}`} className="underline xl:hidden">
      {children}
    </a>
  );
}

/** A day and an opponent: the two cells every schedule row starts with. The day links the row. */
function GameCells({ row }: { row: ScheduleRow }) {
  return (
    <>
      <LedgerCell className="whitespace-nowrap">
        <Link href={gameHref(row.game)} className={ledgerRowLink}>
          <LocalTime at={row.game.startTime} show="day" />
        </Link>
      </LedgerCell>
      <LedgerCell className="whitespace-nowrap">
        <Versus home={row.home} /> <TeamName team={row.opponent} />
      </LedgerCell>
    </>
  );
}

/**
 * The games a team has still to play, in date order, each linking to its game page. The day and
 * the time are the visitor's. Postponed games follow the rest, uncounted: they have no date.
 */
export function UpcomingLedger({
  rows,
  postponed,
}: {
  rows: ScheduleRow[];
  postponed: ScheduleRow[];
}) {
  return (
    <Section id="upcoming" className="scroll-mt-16">
      <SectionHeader title="Upcoming" count={games(rows.length)}>
        <Jump to="results">results</Jump>
      </SectionHeader>
      {rows.length + postponed.length === 0 ? (
        <EmptyLedger>No games left to play this season.</EmptyLedger>
      ) : (
        <Ledger density="compact">
          <LedgerHead>
            <LedgerColumn>date</LedgerColumn>
            <LedgerColumn className="w-full">opponent</LedgerColumn>
            <LedgerColumn numeric>time</LedgerColumn>
          </LedgerHead>
          <LedgerBody>
            {rows.map((row) => (
              <LedgerRow key={row.game.id} interactive live={row.game.status === "live"}>
                <GameCells row={row} />
                <LedgerCell numeric className="whitespace-nowrap">
                  {row.game.status === "live" ? (
                    <LiveMarker />
                  ) : (
                    <LocalTime at={row.game.startTime} show="time" />
                  )}
                </LedgerCell>
              </LedgerRow>
            ))}
            {postponed.map((row) => (
              <LedgerRow key={row.game.id} interactive>
                <GameCells row={row} />
                <LedgerCell numeric tone="note" className="whitespace-nowrap">
                  postponed
                </LedgerCell>
              </LedgerRow>
            ))}
          </LedgerBody>
        </Ledger>
      )}
    </Section>
  );
}

/**
 * A team's finished games this season, newest first, each linking to its Replay: won or lost,
 * whether it went past regulation, and the score with the team's own goals first.
 */
export function ResultsLedger({
  rows,
  wins,
  losses,
}: {
  rows: ResultRow[];
  wins: number;
  losses: number;
}) {
  return (
    <Section id="results" className="scroll-mt-16">
      <SectionHeader
        title="Results"
        count={rows.length === 0 ? undefined : `${games(rows.length)}, ${wins} won, ${losses} lost`}
      >
        <Jump to="upcoming">upcoming</Jump>
      </SectionHeader>
      {rows.length === 0 ? (
        <EmptyLedger>No games played yet this season.</EmptyLedger>
      ) : (
        <Ledger density="compact">
          <LedgerHead>
            <LedgerColumn>date</LedgerColumn>
            <LedgerColumn className="w-full">opponent</LedgerColumn>
            <LedgerColumn>
              <span className="sr-only">result</span>
            </LedgerColumn>
            <LedgerColumn numeric>score</LedgerColumn>
          </LedgerHead>
          <LedgerBody>
            {rows.map((row) => (
              <LedgerRow key={row.game.id} interactive>
                <GameCells row={row} />
                <LedgerCell
                  tone={row.won ? "positive" : "negative"}
                  className="whitespace-nowrap font-bold"
                >
                  {row.won ? "W" : "L"}
                  {row.extraTime && (
                    <LedgerAside className="font-normal"> {row.extraTime}</LedgerAside>
                  )}
                </LedgerCell>
                <LedgerCell numeric className="whitespace-nowrap">
                  {row.teamScore}-{row.opponentScore}
                </LedgerCell>
              </LedgerRow>
            ))}
          </LedgerBody>
        </Ledger>
      )}
    </Section>
  );
}
