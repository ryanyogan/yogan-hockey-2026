import type { StandingsTable } from "@yogan-hockey/schemas";
import {
  Ledger,
  LedgerBody,
  LedgerCell,
  LedgerColumn,
  LedgerHead,
  LedgerRow,
  ledgerRowLink,
} from "@yogan-hockey/ui/components/ledger";
import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import type { ReactNode } from "react";
import { agateName } from "../../lib/agate-copy";
import {
  conferenceLabel,
  formatGoalDifference,
  goalDifferenceTone,
  playoffLine,
} from "../../lib/standings-table";
import { Link } from "../link";
import { teamHref } from "./team-name";

/**
 * One table of a standings view (`standingsView` makes them): a ranked agate table whose rows link
 * to their teams, with a solid ink rule under the last playoff place where the table has one. A
 * team is its agate name ("Toronto", "N.Y. Rangers") and has no mark (HANDOFF.md, question 3);
 * games played step back and points are bold, as in the prototype's standings.
 *
 * `compact` is the dashboard's table, the Reference UI's: rank, the team's abbreviation, wins,
 * losses, overtime losses and points, the columns spread across the table. `header` replaces the
 * line above the table, which otherwise names it.
 */
export function StandingsLedger({
  table,
  compact = false,
  header,
}: {
  table: StandingsTable;
  compact?: boolean;
  header?: ReactNode;
}) {
  const line = playoffLine(table);
  return (
    <Section aria-label={table.title}>
      {header ?? (
        <SectionHeader title={table.title} count={conferenceLabel(table)}>
          {line == null ? undefined : (
            // A note, not a link: quiet, so it stays on a phone's line beside the longest title.
            <span className="font-quiet text-aside normal-case tracking-normal">
              playoff line: top {line}
            </span>
          )}
        </SectionHeader>
      )}
      <Ledger>
        <LedgerHead>
          {/* Wide enough for two digits, so the teams line up from one table to the next. */}
          <LedgerColumn className={compact ? undefined : "min-w-8"}>#</LedgerColumn>
          {/* The team takes the slack, so the figures stay together at the right edge. */}
          <LedgerColumn className={compact ? "w-[40%]" : "w-full"}>team</LedgerColumn>
          {compact ? null : <LedgerColumn numeric>gp</LedgerColumn>}
          <LedgerColumn numeric>w</LedgerColumn>
          <LedgerColumn numeric>l</LedgerColumn>
          <LedgerColumn numeric>otl</LedgerColumn>
          {compact ? null : <LedgerColumn numeric>diff</LedgerColumn>}
          <LedgerColumn numeric>pts</LedgerColumn>
        </LedgerHead>
        <LedgerBody>
          {table.rows.map((row, index) => (
            <LedgerRow key={row.team.id} cutoff={index + 1 === line}>
              <LedgerCell tone="aside">{index + 1}</LedgerCell>
              <LedgerCell className="whitespace-nowrap">
                <Link
                  href={teamHref(row.team)}
                  className={ledgerRowLink}
                  aria-label={compact ? row.team.name : undefined}
                >
                  {compact ? row.team.abbreviation : agateName(row.team)}
                </Link>
              </LedgerCell>
              {compact ? null : (
                <LedgerCell numeric tone="aside">
                  {row.gamesPlayed}
                </LedgerCell>
              )}
              <LedgerCell numeric>{row.wins}</LedgerCell>
              <LedgerCell numeric>{row.losses}</LedgerCell>
              <LedgerCell numeric>{row.otLosses}</LedgerCell>
              {compact ? null : (
                <LedgerCell numeric tone={goalDifferenceTone(row.goalDifferential)}>
                  {formatGoalDifference(row.goalDifferential)}
                </LedgerCell>
              )}
              <LedgerCell numeric tone="strong">
                {row.points}
              </LedgerCell>
            </LedgerRow>
          ))}
        </LedgerBody>
      </Ledger>
    </Section>
  );
}
