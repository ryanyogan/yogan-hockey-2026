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
import { agateName } from "../../lib/agate-copy";
import { gameHref } from "../../lib/scoreboard-view";
import type { ResultRow, ScheduleRow } from "../../lib/team-schedule";
import { Link } from "../link";
import { LocalTime } from "../local-time";
import { EmptyLedger } from "./empty-ledger";
import { Versus } from "./versus";

const games = (count: number) => (count === 1 ? "1 game" : `${count} games`);

/** A link to the other half of the schedule, for a phone, where the two are one long column. */
function Jump({ to, children }: { to: string; children: string }) {
  return (
    // The tabs are 8px above its line, so its reach on a phone starts under them.
    <a href={`#${to}`} className="tap-target underline [--tap-shift:4px] xl:hidden">
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
        <Versus home={row.home} />{" "}
        {/* A phone has room for the agate name, not the club's whole one. */}
        <span className="sm:hidden">{agateName(row.opponent)}</span>
        <span className="max-sm:hidden">{row.opponent.name}</span>
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
        <Ledger>
          <LedgerHead>
            <LedgerColumn>date</LedgerColumn>
            <LedgerColumn className="w-full">opponent</LedgerColumn>
            <LedgerColumn numeric>time</LedgerColumn>
          </LedgerHead>
          <LedgerBody>
            {rows.map((row) => (
              <LedgerRow key={row.game.id} live={row.game.status === "live"}>
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
              <LedgerRow key={row.game.id}>
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
        <Ledger>
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
              <LedgerRow key={row.game.id}>
                <GameCells row={row} />
                {/* A win is bold and a loss steps back, as a line score's winner and loser do. */}
                <LedgerCell tone={row.won ? "strong" : "aside"} className="whitespace-nowrap">
                  {row.won ? "W" : "L"}
                  {row.extraTime && (
                    <LedgerAside className="font-quiet"> {row.extraTime}</LedgerAside>
                  )}
                </LedgerCell>
                <LedgerCell numeric tone="strong" className="whitespace-nowrap">
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
