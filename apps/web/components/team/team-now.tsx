"use client";

import type { Game } from "@yogan-hockey/schemas";
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
import Link from "next/link";
import { gameHref } from "../../lib/scoreboard-view";
import { liveGame, nextGame, scheduleRow } from "../../lib/team-schedule";
import { LocalTime } from "../local-time";
import { TeamName } from "../nhl/team-name";
import { GameLedger } from "../scoreboard/game-ledger";
import { useScoreboard } from "../scoreboard/scoreboard-provider";
import { Versus } from "./versus";

/**
 * What a team is doing now, beside its header: the banner while it is playing, and otherwise its
 * Next Game card. Both link to the game's page. It reads today's games from the page's Scoreboard
 * socket, so the banner appears, keeps score and gives way without a refresh.
 *
 * `listed` is the next game as the cached team page has it, which can be an hour old: the
 * Scoreboard says whether that game has started since.
 */
export function TeamNow({ teamId, listed }: { teamId: string; listed: Game | null }) {
  const scoreboard = useScoreboard();
  const live = liveGame(teamId, scoreboard.games);
  if (live != null) {
    return (
      // The game ledger's columns are fixed and need the page's whole width beside a header.
      <Section className="xl:col-span-2">
        <SectionHeader title="Playing now" />
        <GameLedger games={[live]} />
      </Section>
    );
  }

  const next = nextGame(listed, scoreboard);
  return next == null ? null : <NextGame teamId={teamId} game={next} />;
}

/** The Next Game card: a ruled block of one row, linking to the scheduled game's page. */
function NextGame({ teamId, game }: { teamId: string; game: Game }) {
  const { opponent, home } = scheduleRow(teamId, game);
  return (
    <Section>
      <SectionHeader title="Next game" />
      <Ledger>
        <LedgerHead>
          <LedgerColumn>date</LedgerColumn>
          <LedgerColumn>opponent</LedgerColumn>
          <LedgerColumn className="w-full sm:w-auto">time</LedgerColumn>
          {/* A phone has no room for the arena beside the three it needs. */}
          <LedgerColumn className="w-full max-sm:hidden">where</LedgerColumn>
        </LedgerHead>
        <LedgerBody>
          <LedgerRow interactive>
            <LedgerCell className="whitespace-nowrap">
              <Link href={gameHref(game)} className={ledgerRowLink}>
                <LocalTime at={game.startTime} show="day" />
              </Link>
            </LedgerCell>
            <LedgerCell className="whitespace-nowrap">
              <Versus home={home} /> <TeamName team={opponent} />
            </LedgerCell>
            <LedgerCell className="whitespace-nowrap">
              <LocalTime at={game.startTime} show="time" />
            </LedgerCell>
            <LedgerCell tone="note" className="whitespace-nowrap max-sm:hidden">
              {game.venue}
            </LedgerCell>
          </LedgerRow>
        </LedgerBody>
      </Ledger>
    </Section>
  );
}
