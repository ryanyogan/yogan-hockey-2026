import type { TeamDetail } from "@yogan-hockey/schemas";
import {
  Ledger,
  LedgerBody,
  LedgerCell,
  LedgerColumn,
  LedgerHead,
  LedgerRow,
} from "@yogan-hockey/ui/components/ledger";
import { Section } from "@yogan-hockey/ui/components/section";
import { type TeamStanding, teamPlace, teamStandingLine } from "../../lib/team-page";
import { clubName, storyKicker, storyRule } from "../story/type";
import { TeamMark } from "../team-mark";
import { EmptyLedger } from "./empty-ledger";

/**
 * The head of a team's page, set as a story is (docs/design/agate.md § Page anatomy): a heavy
 * rule, a red line saying where the team plays and in which conference and division, its name as
 * the headline with its mark (on one line, sized by the header, which is its `@container`), and its record so far in agate, ending in its place in the division.
 * `standing` is where the league standings have the team; without it the red line is the city
 * alone and the place is a dash.
 */
export function TeamHeader({
  detail: { team, stats },
  standing,
}: {
  detail: Pick<TeamDetail, "team" | "stats">;
  standing: TeamStanding | null;
}) {
  const place = teamPlace(team, standing);

  return (
    <Section>
      <header data-slot="team-header" className={`@container ${storyRule}`}>
        <p className={storyKicker}>
          {/* A phone breaks the line between two of these, never inside one. */}
          {place.flatMap((part, index) => [
            <span key={part} className="whitespace-nowrap">
              {part}
              {index < place.length - 1 && " ·"}
            </span>,
            " ",
          ])}
        </p>
        <h1 className={`mt-3 ${clubName}`}>
          {/* The one place a team's mark is drawn on its page (agate.md, Decisions). */}
          <TeamMark teamId={team.id} size="headline" eager className="mr-[0.3em]" />
          {team.name}
        </h1>
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
                  {teamStandingLine(standing)}
                </LedgerCell>
              </LedgerRow>
            </LedgerBody>
          </Ledger>
        )}
      </div>
    </Section>
  );
}
