"use client";

import type { Game } from "@yogan-hockey/schemas";
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
import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import { pickNote } from "../../lib/picks";
import { gameHref } from "../../lib/scoreboard-view";
import { liveGame, nextGame, nextGamePick, scheduleRow } from "../../lib/team-schedule";
import { Link } from "../link";
import { LocalTime } from "../local-time";
import { TeamName } from "../nhl/team-name";
import { GameLedger } from "../scoreboard/game-ledger";
import { useScoreboard } from "../scoreboard/scoreboard-provider";
import { TeamMark } from "../team-mark";
import { Versus } from "./versus";

/**
 * What a team is doing now, beside its header: the banner while it is playing, and otherwise its
 * Next Game card. Both link to the game's page. It reads today's games from the page's Scoreboard
 * socket, so the banner appears, keeps score and gives way without a refresh.
 *
 * `listed` is the next game as the cached team page has it, which can be an hour old: the
 * Scoreboard says whether that game has started since.
 *
 * `picks` is each game of today's slate's pick in one line, by game id, as the page's server
 * component read them (see `LiveScores`). Both the banner's row and the card show the team's.
 */
export function TeamNow({
  teamId,
  listed,
  picks = {},
}: {
  teamId: string;
  listed: Game | null;
  picks?: Readonly<Record<string, string>>;
}) {
  const scoreboard = useScoreboard();
  const live = liveGame(teamId, scoreboard.games);
  if (live != null) {
    return (
      // The game ledger's columns are fixed and need the page's whole width beside a header.
      <Section className="xl:col-span-2">
        <SectionHeader title="Playing now" />
        <GameLedger games={[live]} pick={(game) => pickNote(picks[game.id], game.status)} />
      </Section>
    );
  }

  const next = nextGame(listed, scoreboard);
  return next == null ? null : (
    <NextGame teamId={teamId} game={next} pick={nextGamePick(next, picks, scoreboard.games)} />
  );
}

/**
 * The Next Game card: a ruled block of one row, linking to the scheduled game's page. `pick` is
 * the game's pick in one line, drawn as a game row's note has it: ahead of where it is played.
 */
function NextGame({ teamId, game, pick }: { teamId: string; game: Game; pick?: string }) {
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
              {/* A phone's row has no room for it: the longest ends 2px inside the ledger as it is. */}
              <Versus home={home} />{" "}
              <TeamMark teamId={opponent.id} className="mr-1.5 max-sm:hidden" />
              <TeamName team={opponent} />
            </LedgerCell>
            <LedgerCell className="whitespace-nowrap">
              <LocalTime at={game.startTime} show="time" />
              {/*
                A phone has no last column: the pick goes beside the time, on its line. The gap
                is what leaves the longest row ("Wed Oct 28", "10:00 PM", "pick pending") in 390.
              */}
              {pick && <LedgerAside className="ml-2 sm:hidden">{pick}</LedgerAside>}
            </LedgerCell>
            <LedgerCell tone="note" className="whitespace-nowrap max-sm:hidden">
              {pick && (
                <span data-slot="game-pick" className="mr-4">
                  {pick}
                </span>
              )}
              {game.venue}
            </LedgerCell>
          </LedgerRow>
        </LedgerBody>
      </Ledger>
    </Section>
  );
}
