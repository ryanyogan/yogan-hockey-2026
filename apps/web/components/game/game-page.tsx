"use client";

import type { Game, GameHeader, Play, ScoreboardGame } from "@yogan-hockey/schemas";
import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import { type ReactNode, useState } from "react";
import type { FoundGame } from "../../lib/find-game";
import { gamePhase, streamReading, streamStarts } from "../../lib/game/page-state";
import type { GameTab } from "../../lib/game/tabs";
import { useGameStream } from "../../lib/game/use-game-stream";
import { PICK_PENDING } from "../../lib/picks";
import { useScoreboard } from "../scoreboard/scoreboard-provider";
import { FinishedGame } from "./finished-game";
import { MatchupRink } from "./game-rink";
import { GameView } from "./game-view";
import { PeriodTimeline } from "./period-timeline";

type Slots = {
  /** The open tab of the Game Stream and the finished game. */
  tab: GameTab;
  pathname: string;
  /** The matchup facts under a scheduled game's rink, drawn by the server. */
  matchup: ReactNode;
  /**
   * The pick: a section of the scheduled page, and "the pick" tab once the game is on. Null when
   * there is none to show, and then there is no section and no tab.
   */
  pick: ReactNode;
  /** No Prediction yet: a game still to come says "pick pending" until one arrives. */
  pickPending: boolean;
};

/**
 * `/nhl/games/:id` in all its states, on one open page. It starts from what the server read from
 * the Game Agent. A game still to come is the matchup with no socket of its own; when the
 * Scoreboard, which every page already follows, reports it live, the page opens the Game Agent's
 * socket and follows the game from there to its final. Give it `key={gameId}`.
 */
export function GamePage({ gameId, game, ...slots }: { gameId: string; game: FoundGame } & Slots) {
  const scoreboard = useScoreboard().games.find((onSlate) => onSlate.id === gameId);
  // Kept once true: the Scoreboard's slate moves on to another day under an open page, and a
  // refresh of the server's snapshot must not take the socket away from a game being followed.
  const [streaming, setStreaming] = useState(false);
  if (!streaming && streamStarts(game.header.status, scoreboard?.status)) setStreaming(true);

  if (streaming)
    return <GameStream gameId={gameId} game={game} scoreboard={scoreboard} {...slots} />;
  return (
    <GameInPhase
      gameId={gameId}
      header={game.header}
      plays={game.plays}
      delayed={game.delayed}
      archived={game.archived}
      {...slots}
    />
  );
}

/** The page with the Game Agent's socket open: rendered only while the game is worth one. */
function GameStream({
  gameId,
  game,
  scoreboard,
  ...slots
}: { gameId: string; game: FoundGame; scoreboard: ScoreboardGame | undefined } & Slots) {
  const stream = useGameStream(gameId, game);
  return (
    <GameInPhase
      gameId={gameId}
      header={stream.header ?? game.header}
      plays={stream.plays}
      delayed={stream.delayed}
      reconnecting={stream.reconnecting}
      archived={stream.archived}
      scoreboard={scoreboard}
      {...slots}
    />
  );
}

/** One game drawn as the state its status puts it in. */
function GameInPhase({
  gameId,
  header,
  plays,
  delayed,
  reconnecting,
  archived,
  scoreboard,
  tab,
  pathname,
  matchup,
  pick,
  pickPending,
}: {
  gameId: string;
  header: GameHeader;
  plays: readonly Play[];
  delayed: boolean;
  /** The Game Agent's socket is down. Only a page with a socket says so. */
  reconnecting?: boolean;
  archived: boolean;
  scoreboard?: Pick<Game, "status" | "period" | "clock">;
} & Slots) {
  const { status, notice } = streamReading({
    header,
    plays,
    delayed,
    reconnecting,
    scoreboard,
  });
  switch (gamePhase(header.status)) {
    case "scheduled":
      return (
        <ScheduledGame
          header={header}
          matchup={matchup}
          // The server's answer, from before any socket: a game called off since waits for none.
          pick={pick ?? (pickPending && header.status === "scheduled" ? <GamePickPending /> : null)}
        />
      );
    case "live":
      return (
        <GameView
          header={header}
          plays={plays}
          tab={tab}
          pathname={pathname}
          pick={pick}
          status={status}
          notice={notice}
        />
      );
    case "finished":
      return (
        <FinishedGame
          gameId={gameId}
          header={header}
          plays={plays}
          archived={archived}
          notice={notice}
          tab={tab}
          pathname={pathname}
          pick={pick}
        />
      );
  }
}

const noSelection = () => {};

/** What a game still to come says in the pick's place until its Prediction arrives. */
function GamePickPending() {
  return (
    <p data-slot="game-pick-pending" className="max-w-prose text-foreground/70">
      {PICK_PENDING}
    </p>
  );
}

/**
 * A game still to come (or called off): the rink and the timeline where the Game Stream will
 * draw them, empty, so nothing above the fold moves when the game starts; then the pick and the
 * matchup.
 */
function ScheduledGame({
  header,
  matchup,
  pick,
}: {
  header: GameHeader;
  matchup: ReactNode;
  pick: ReactNode;
}) {
  const calledOff = header.status === "postponed";
  return (
    <div data-slot="game-matchup">
      <MatchupRink header={header} status={calledOff ? header.detail : undefined} />
      <div className="mt-6">
        <PeriodTimeline
          game={header}
          plays={[]}
          focusId={null}
          selectedId={null}
          onSelect={noSelection}
        />
        <p data-slot="timeline-hint" className="mt-1 text-foreground/50">
          {calledOff
            ? "This game will not be played as scheduled."
            : "The plays are drawn here once the puck drops. This page follows the game by itself."}
        </p>
      </div>
      <div className="mt-6 space-y-8">
        {pick != null && (
          <Section data-slot="game-pick">
            <SectionHeader title="The pick" />
            {pick}
          </Section>
        )}
        {matchup}
      </div>
    </div>
  );
}
