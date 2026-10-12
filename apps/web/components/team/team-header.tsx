import type { StandingsRow, TeamDetail } from "@yogan-hockey/schemas";
import {
  Ledger,
  LedgerBody,
  LedgerCell,
  LedgerColumn,
  LedgerHead,
  LedgerRow,
} from "@yogan-hockey/ui/components/ledger";
import { Section, sectionLabel } from "@yogan-hockey/ui/components/section";
import type { ReactNode } from "react";
import { teamPlace } from "../../lib/team-page";
import { TeamMark } from "../team-mark";
import { EmptyLedger } from "./empty-ledger";

/**
 * The head of a team's page, set as a story is (docs/design/agate.md § Page anatomy): a heavy
 * rule, a red line saying where the team plays and in which conference and division, its name as
 * the headline with its mark, and its record so far in agate. `standing` is the team's row in the
 * league standings; without it the red line is the city alone.
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
  const place = teamPlace(team, standing);

  return (
    <Section>
      <header data-slot="team-header" className="border-rule border-t-3 pt-3.5">
        <p className={sectionLabel}>
          {/* A phone breaks the line between two of these, never inside one. */}
          {place.flatMap((part, index) => [
            <span key={part} className="whitespace-nowrap">
              {part}
              {index < place.length - 1 && " ·"}
            </span>,
            " ",
          ])}
        </p>
        {/* The heart stays at the end of the first line when a phone wraps the name. */}
        <div className="mt-3 flex items-start justify-between gap-4">
          <h1 className="text-balance font-serif font-strong text-headline [font-variation-settings:'opsz'_60]">
            {/* The one place a team's mark is drawn on its page (HANDOFF.md, question 3). */}
            <TeamMark teamId={team.id} size="headline" eager className="mr-[0.3em]" />
            {team.name}
          </h1>
          {action}
        </div>
      </header>
      <div className="mt-3">
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
      </div>
    </Section>
  );
}
