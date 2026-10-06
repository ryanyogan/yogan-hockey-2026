import type { StandingsRow, TeamDetail } from "@yogan-hockey/schemas";
import {
  Ledger,
  LedgerBody,
  LedgerCell,
  LedgerColumn,
  LedgerHead,
  LedgerRow,
} from "@yogan-hockey/ui/components/ledger";
import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import type { ReactNode } from "react";
import { EmptyLedger } from "./empty-ledger";

/**
 * The head of a team's page: its name, where it plays and in which conference and division, and
 * its record so far. `standing` is the team's row in the league standings, which is where the
 * conference and division come from; without it the line is the location alone.
 */
export function TeamHeader({
  detail: { team, stats, standingSummary },
  standing,
  action,
}: {
  detail: TeamDetail;
  standing: Pick<StandingsRow, "conference" | "division"> | null;
  /** Sits at the right end of the name's line: the heart that makes the team a favorite (#45). */
  action?: ReactNode;
}) {
  const where = [team.location, standing?.conference.name, standing?.division.name].filter(
    (part) => part != null,
  );

  return (
    <Section>
      <SectionHeader
        // The heart stays at the end of the first line when a phone wraps the rest.
        className="flex-nowrap"
        title={team.name}
        // A phone breaks the line between two of these, never inside one.
        count={where.flatMap((part, index) => [
          <span key={part} className="whitespace-nowrap">
            {part}
            {index < where.length - 1 && " ·"}
          </span>,
          " ",
        ])}
      >
        {action}
      </SectionHeader>
      {stats == null ? (
        <EmptyLedger>No games played yet this season.</EmptyLedger>
      ) : (
        <Ledger>
          <LedgerHead>
            <LedgerColumn numeric>w</LedgerColumn>
            <LedgerColumn numeric>l</LedgerColumn>
            <LedgerColumn numeric>otl</LedgerColumn>
            <LedgerColumn numeric>pts</LedgerColumn>
            {/* Takes the slack, so the four figures stay together at the left edge. */}
            <LedgerColumn className="w-full pl-6">standing</LedgerColumn>
          </LedgerHead>
          <LedgerBody>
            <LedgerRow>
              <LedgerCell numeric>{stats.wins}</LedgerCell>
              <LedgerCell numeric>{stats.losses}</LedgerCell>
              <LedgerCell numeric>{stats.otLosses}</LedgerCell>
              <LedgerCell numeric tone="strong">
                {stats.points}
              </LedgerCell>
              <LedgerCell tone="note" className="pl-6">
                {standingSummary ?? "-"}
              </LedgerCell>
            </LedgerRow>
          </LedgerBody>
        </Ledger>
      )}
    </Section>
  );
}
