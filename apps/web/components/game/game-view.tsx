"use client";

import type { GameHeader, Play } from "@yogan-hockey/schemas";
import { Button } from "@yogan-hockey/ui/components/button";
import { UrlTabs } from "@yogan-hockey/ui/components/url-tabs";
import { type ReactNode, useState } from "react";
import { focusedPlay, toggleSelection, visiblePlays } from "../../lib/game/plays";
import { type GameTab, gameTabLinks, shownGameTab } from "../../lib/game/tabs";
import { Link } from "../link";
import { GameRink } from "./game-rink";
import { PeriodTimeline } from "./period-timeline";
import { KeyPlaysToggle, PlaysList, ScoringSummary } from "./plays-list";

/** No plays still to come: every page but a Replay in the middle of a game. One array, not one a render. */
const NONE: readonly Play[] = [];

/**
 * A game as the Game Stream and the Replay show it: the rink, the period timeline, and the tabs.
 * It is drawn from `header` and `plays` alone, so a page feeds it whatever it has: the Game
 * Agent's state as it arrives, or a finished game's plays up to a playhead.
 *
 * It keeps two things itself: which play is picked, and whether every play is shown. With no
 * play picked it follows the game, so the latest play is the one in focus. A page that drives the
 * selection itself (a Replay stepping through) passes `selectedId` and `onSelect`; the Replay also
 * holds the key-plays toggle (`everyPlay`), names the plays past its playhead (`upcoming`) and
 * puts its controls where the timeline's hint is (`transport`).
 */
export function GameView({
  header,
  plays,
  tab: askedTab,
  pathname,
  pick,
  status,
  notice,
  selectedId: controlledId,
  onSelect,
  everyPlay: controlledEveryPlay,
  onEveryPlayChange,
  upcoming = NONE,
  transport,
}: {
  header: GameHeader;
  /** Every play so far, in the game's order. */
  plays: readonly Play[];
  /** The open tab, which the page reads from `?tab=` with `gameTabFrom`. */
  tab: GameTab;
  /** The page's own path, which the tabs link back to. */
  pathname: string;
  /** What "the pick" tab shows. Null for a game with no pick, which has no such tab. */
  pick: ReactNode;
  /** Words for centre ice in place of the period and clock: "End of 2nd". */
  status?: string;
  /** A warning under them: "Updates delayed". */
  notice?: string;
  /** The picked play, for a page that holds the selection itself; null follows the game. */
  selectedId?: string | null;
  onSelect?: (playId: string | null) => void;
  /** The key-plays toggle, for a page that holds it itself. */
  everyPlay?: boolean;
  onEveryPlayChange?: (everyPlay: boolean) => void;
  /**
   * The rest of the game, for a Replay whose `plays` stop at its playhead: these keep their ticks,
   * dimmed, so the timeline can be clicked ahead, and keep the timeline and the ends of the rink
   * where the whole game puts them. They are not listed or drawn on the ice.
   */
  upcoming?: readonly Play[];
  /** What sits under the timeline in place of its hint: the Replay's controls. */
  transport?: ReactNode;
}) {
  const hasPick = pick != null;
  const tab = shownGameTab(askedTab, hasPick);
  const [ownId, setOwnId] = useState<string | null>(null);
  const [ownEveryPlay, setOwnEveryPlay] = useState(false);
  const everyPlay = controlledEveryPlay ?? ownEveryPlay;
  const setEveryPlay = (next: boolean) => {
    if (controlledEveryPlay === undefined) setOwnEveryPlay(next);
    onEveryPlayChange?.(next);
  };

  const selectedId = controlledId === undefined ? ownId : controlledId;
  const focus = focusedPlay(plays, selectedId);
  const picked = focus != null && focus.id === selectedId;
  const select = (playId: string | null) => {
    if (controlledId === undefined) setOwnId(playId);
    onSelect?.(playId);
  };
  const toggle = (playId: string) => select(toggleSelection(selectedId, playId));

  const keyPlays = visiblePlays(plays, false);
  const listed = everyPlay ? plays : keyPlays;
  // The play in focus is always drawn, so a Replay stepping onto a play that is not a Key play
  // still has its dot and its tick.
  const shown = focus == null || listed.includes(focus) ? listed : [...listed, focus];
  const focusId = focus?.id ?? null;
  const game = upcoming.length === 0 ? plays : [...plays, ...upcoming];
  const upcomingTicks = visiblePlays(upcoming, everyPlay);

  return (
    <div data-slot="game-view">
      <GameRink
        header={header}
        plays={game}
        drawn={shown}
        focus={focus}
        status={status}
        notice={notice}
      />
      <div className="mt-6">
        <PeriodTimeline
          game={header}
          plays={game}
          ticks={shown}
          upcoming={upcomingTicks}
          focusId={focusId}
          selectedId={selectedId}
          onSelect={toggle}
        />
        {transport ?? (
          <p data-slot="timeline-hint" className="mt-1 text-muted-foreground">
            Click a tick to see that play on the ice.{" "}
            {picked ? (
              <>
                Showing a picked play.{" "}
                <Button
                  variant="ghost"
                  size="inline"
                  className="underline"
                  onClick={() => select(null)}
                >
                  {header.status === "live" ? "follow live" : "back to the latest"}
                </Button>
              </>
            ) : header.status === "live" ? (
              "Following live."
            ) : (
              "Showing the latest play."
            )}
          </p>
        )}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <UrlTabs label="Game" link={Link} current={tab} tabs={gameTabLinks(pathname, hasPick)} />
        {/* On every tab: it decides the dots and the ticks as well as the list. */}
        <KeyPlaysToggle
          everyPlay={everyPlay}
          onChange={setEveryPlay}
          keyCount={upcoming.length === 0 ? keyPlays.length : visiblePlays(game, false).length}
          totalCount={game.length}
        />
      </div>
      <div data-slot="game-tab" className="mt-2">
        {tab === "plays" && (
          <PlaysList
            header={header}
            plays={listed}
            focusId={focusId}
            selectedId={selectedId}
            onSelect={toggle}
          />
        )}
        {tab === "scoring" && (
          <ScoringSummary
            header={header}
            plays={plays}
            focusId={focusId}
            selectedId={selectedId}
            onSelect={toggle}
          />
        )}
        {tab === "pick" && pick}
      </div>
    </div>
  );
}
