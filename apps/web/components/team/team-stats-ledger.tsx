import type { TeamDetail } from "@yogan-hockey/schemas";
import {
  Ledger,
  LedgerBody,
  LedgerCell,
  LedgerColumn,
  LedgerHead,
  LedgerRow,
} from "@yogan-hockey/ui/components/ledger";
import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import { formatGoalDifference, goalDifferenceTone } from "../../lib/standings-table";
import { EmptyLedger } from "./empty-ledger";

/** "18.2" from 18.182; a dash until ESPN has the figure, early in a season. */
const percent = (value: number | null) => (value == null ? "-" : value.toFixed(1));

/**
 * A team's season in figures: games played, goals for and against and their difference, the
 * power play and the penalty kill, and the record at home and on the road.
 */
export function TeamStatsLedger({ detail: { stats, record } }: { detail: TeamDetail }) {
  return (
    <Section>
      <SectionHeader title="Season stats" />
      {stats == null ? (
        <EmptyLedger>No games played yet this season.</EmptyLedger>
      ) : (
        <Ledger>
          <LedgerHead>
            <LedgerColumn numeric>gp</LedgerColumn>
            <LedgerColumn numeric>gf</LedgerColumn>
            <LedgerColumn numeric>ga</LedgerColumn>
            <LedgerColumn numeric>diff</LedgerColumn>
            <LedgerColumn numeric>pp%</LedgerColumn>
            <LedgerColumn numeric>pk%</LedgerColumn>
            <LedgerColumn numeric>home</LedgerColumn>
            <LedgerColumn numeric>road</LedgerColumn>
            {/* Takes the slack, so the figures stay together at the left edge. */}
            <LedgerColumn className="w-full p-0" />
          </LedgerHead>
          <LedgerBody>
            <LedgerRow>
              <LedgerCell numeric>{stats.gamesPlayed}</LedgerCell>
              <LedgerCell numeric>{stats.goalsFor}</LedgerCell>
              <LedgerCell numeric>{stats.goalsAgainst}</LedgerCell>
              <LedgerCell numeric tone={goalDifferenceTone(stats.goalDifferential)}>
                {formatGoalDifference(stats.goalDifferential)}
              </LedgerCell>
              <LedgerCell numeric>{percent(stats.powerPlayPct)}</LedgerCell>
              <LedgerCell numeric>{percent(stats.penaltyKillPct)}</LedgerCell>
              <LedgerCell numeric className="whitespace-nowrap">
                {record.home ?? "-"}
              </LedgerCell>
              <LedgerCell numeric className="whitespace-nowrap">
                {record.road ?? "-"}
              </LedgerCell>
              <LedgerCell className="p-0" />
            </LedgerRow>
          </LedgerBody>
        </Ledger>
      )}
    </Section>
  );
}
