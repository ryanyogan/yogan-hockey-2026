import type { Game, ScoreboardGame } from "@yogan-hockey/schemas";
import {
  Ledger,
  LedgerBody,
  LedgerCell,
  LedgerColumn,
  LedgerHead,
  LedgerRow,
  ledgerRowLink,
} from "@yogan-hockey/ui/components/ledger";
import { LiveMarker } from "@yogan-hockey/ui/components/marker";
import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import Link from "next/link";
import { gameHref, liveGame } from "../../lib/team-schedule";
import { LocalTime } from "../local-time";
import { TeamName } from "../nhl/team-name";
import { Versus } from "./versus";

/**
 * The banner on a team's page while the team is playing: the game as tonight's ledger draws a
 * game in progress, linking to its Game Stream. Draws nothing when the team is not playing.
 *
 * `games` is today's slate. The page passes the Scoreboard's first paint; to keep the banner
 * current, make this a client component and take the slate from the Scoreboard socket instead
 * (#41). Nothing else here changes.
 */
export function TeamLiveBanner({
  teamId,
  games,
}: {
  teamId: string;
  games: readonly ScoreboardGame[];
}) {
  const game = liveGame(teamId, games);
  if (game == null) return null;

  return (
    <Section>
      <SectionHeader title="Playing now" />
      <Ledger>
        <LedgerHead>
          <LedgerColumn>status</LedgerColumn>
          <LedgerColumn>away</LedgerColumn>
          <LedgerColumn numeric />
          <LedgerColumn>home</LedgerColumn>
          <LedgerColumn numeric />
          <LedgerColumn className="w-full" />
        </LedgerHead>
        <LedgerBody>
          <LedgerRow live interactive>
            <LedgerCell>
              <Link href={gameHref(game)} className={ledgerRowLink}>
                <LiveMarker strong className="text-foreground underline">
                  {game.detail}
                </LiveMarker>
              </Link>
            </LedgerCell>
            <LedgerCell>{game.away.abbreviation}</LedgerCell>
            <LedgerCell tone="score">{game.away.score}</LedgerCell>
            <LedgerCell>{game.home.abbreviation}</LedgerCell>
            <LedgerCell tone="score">{game.home.score}</LedgerCell>
            <LedgerCell />
          </LedgerRow>
        </LedgerBody>
      </Ledger>
    </Section>
  );
}

/**
 * The Next Game card: the team's next scheduled game as a ruled block of one row, linking to the
 * game's page. `teamId` says which side is the opponent.
 */
export function NextGame({ teamId, game }: { teamId: string; game: Game }) {
  const home = game.home.id === teamId;
  const opponent = home ? game.away : game.home;

  return (
    <Section>
      <SectionHeader title="Next game" />
      <Ledger>
        <LedgerHead>
          <LedgerColumn>date</LedgerColumn>
          <LedgerColumn>opponent</LedgerColumn>
          <LedgerColumn>time</LedgerColumn>
          {/* A phone has no room for the arena beside the three it needs. */}
          <LedgerColumn className="hidden w-full sm:table-cell">where</LedgerColumn>
        </LedgerHead>
        <LedgerBody>
          <LedgerRow interactive>
            <LedgerCell className="whitespace-nowrap">
              <Link href={gameHref(game)} className={ledgerRowLink}>
                <LocalTime startTime={game.startTime} show="day" />
              </Link>
            </LedgerCell>
            <LedgerCell className="whitespace-nowrap">
              <Versus home={home} /> <TeamName team={opponent} />
            </LedgerCell>
            <LedgerCell className="w-full whitespace-nowrap sm:w-auto">
              <LocalTime startTime={game.startTime} show="time" />
            </LedgerCell>
            <LedgerCell tone="note" className="hidden whitespace-nowrap sm:table-cell">
              {game.venue}
            </LedgerCell>
          </LedgerRow>
        </LedgerBody>
      </Ledger>
    </Section>
  );
}
