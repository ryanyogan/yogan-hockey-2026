"use client";

import type { GameHeader, Play } from "@yogan-hockey/schemas";
import { Button } from "@yogan-hockey/ui/components/button";
import { navItemVariants } from "@yogan-hockey/ui/components/nav-item";
import { type ReactNode, useEffect, useState } from "react";
import {
  headerAt,
  REPLAY_OPENED,
  REPLAY_SPEEDS,
  type ReplayAction,
  type ReplaySpeed,
  type Replay as ReplayState,
  replayPosition,
  replayReducer,
  splitAtPlayhead,
  statusAt,
  stepMilliseconds,
} from "../../lib/game/replay";
import type { GameTab } from "../../lib/game/tabs";
import { GameView } from "./game-view";

/**
 * The Replay: a finished game on the Game Stream's page, opened with the whole game laid out and
 * able to step through it. `plays` is every play of the game, read from D1.
 *
 * It holds the playhead (`lib/game/replay.ts` has the rules) and the key-plays toggle, and gives
 * `GameView` the game as it stood at the playhead: the plays so far, the score and shots after
 * the last of them, and that play's period and clock over centre ice. The plays still to come
 * keep faint ticks on the timeline, so any tick can be clicked to move the playhead there.
 *
 * Playing steps through what the toggle lists: the Key plays, or every play once every play is
 * shown. Changing the toggle while it plays changes what the next step lands on.
 */
export function Replay({
  header,
  plays,
  notice,
  tab,
  pathname,
  pick,
  pending,
}: {
  header: GameHeader;
  plays: readonly Play[];
  /**
   * Shown in place of the controls while `plays` are not yet D1's: the game is laid out and can
   * be browsed, and what the visitor picked is kept when the controls arrive.
   */
  pending?: ReactNode;
  notice?: string;
  tab: GameTab;
  pathname: string;
  pick: ReactNode;
}) {
  const [replay, setReplay] = useState(REPLAY_OPENED);
  const [everyPlay, setEveryPlay] = useState(false);
  const dispatch = (action: ReplayAction) =>
    setReplay((state) => replayReducer(state, action, plays, everyPlay));

  // The fixed pace: one step a while after the playhead last moved, whatever the game's real gaps
  // were. Timed from each move, so a play clicked while playing is shown for a whole step.
  const { playing, speed, playhead } = replay;
  useEffect(() => {
    if (!playing || playhead == null) return;
    const pace = setTimeout(
      () => setReplay((state) => replayReducer(state, { type: "step" }, plays, everyPlay)),
      stepMilliseconds(speed),
    );
    return () => clearTimeout(pace);
  }, [playing, speed, playhead, plays, everyPlay]);

  const { played, upcoming } = splitAtPlayhead(plays, replay.playhead);
  const wholeGame = upcoming.length === 0;

  return (
    <GameView
      header={headerAt(header, plays, replay.playhead)}
      plays={played}
      upcoming={upcoming}
      status={statusAt(plays, replay.playhead)}
      notice={notice}
      tab={tab}
      pathname={pathname}
      pick={pick}
      selectedId={wholeGame ? null : (played.at(-1)?.id ?? null)}
      // Clicking the play the playhead is on unpicks it, which a Replay has no use for.
      onSelect={(playId) => playId != null && dispatch({ type: "seek", playId })}
      everyPlay={everyPlay}
      onEveryPlayChange={setEveryPlay}
      transport={
        pending ?? (
          <ReplayTransport
            replay={replay}
            wholeGame={wholeGame}
            position={replayPosition(plays, replay.playhead, everyPlay)}
            everyPlay={everyPlay}
            dispatch={dispatch}
          />
        )
      }
    />
  );
}

/**
 * Play or pause, back to the whole game, and the speed, on one line under the timeline. Nothing
 * on it changes width when playing starts, and at phone width every target is 44px tall.
 */
function ReplayTransport({
  replay,
  wholeGame,
  position,
  everyPlay,
  dispatch,
}: {
  replay: ReplayState;
  wholeGame: boolean;
  position: { at: number; of: number };
  everyPlay: boolean;
  dispatch: (action: ReplayAction) => void;
}) {
  const stepped = everyPlay ? "play" : "key play";
  return (
    <div
      data-slot="replay-transport"
      data-playing={replay.playing}
      className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2"
    >
      <Button
        data-slot="replay-play"
        className="w-16 max-sm:h-11 max-sm:w-20"
        aria-label={replay.playing ? "Pause the replay" : "Play the replay"}
        onClick={() => dispatch({ type: replay.playing ? "pause" : "play" })}
      >
        {replay.playing ? "pause" : "play"}
      </Button>
      <Button
        data-slot="replay-end"
        variant="outline"
        className="aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:hover:bg-transparent max-sm:h-11 max-sm:px-3"
        // Not `disabled`: the button turns idle under the finger that pressed it, and a disabled
        // button drops the keyboard's focus.
        aria-disabled={wholeGame && !replay.playing}
        onClick={() => dispatch({ type: "end" })}
      >
        whole game
      </Button>
      <ReplaySpeedChoice
        speed={replay.speed}
        onChange={(speed) => dispatch({ type: "speed", speed })}
      />
      {/* One line at every width, so the page below it stays put when playing starts. */}
      <p
        data-slot="replay-position"
        className="min-w-0 flex-1 truncate text-foreground/50 max-sm:basis-full"
      >
        {wholeGame ? (
          <>
            The whole game.
            <span className="max-sm:hidden">
              {" "}
              Play steps through {everyPlay ? "every play" : "the key plays"}; a tick or a play
              jumps to it.
            </span>
          </>
        ) : (
          `${stepped} ${position.at} of ${position.of}`
        )}
      </p>
    </div>
  );
}

function ReplaySpeedChoice({
  speed,
  onChange,
}: {
  speed: ReplaySpeed;
  onChange: (speed: ReplaySpeed) => void;
}) {
  return (
    <fieldset data-slot="replay-speed" className="flex">
      <legend className="sr-only">Replay speed</legend>
      {REPLAY_SPEEDS.map((choice) => (
        <label
          key={choice}
          className={`cursor-pointer has-focus-visible:ring-2 has-focus-visible:ring-ring max-sm:px-4 max-sm:py-3 ${navItemVariants(
            { current: choice === speed },
          )}`}
        >
          <input
            type="radio"
            name="replay-speed"
            className="sr-only"
            checked={choice === speed}
            onChange={() => onChange(choice)}
            // A click as well, as the key-plays toggle has it: one made before the page hydrates
            // checks the radio without telling React.
            onClick={() => onChange(choice)}
          />
          {choice}x
        </label>
      ))}
    </fieldset>
  );
}

/** Where the transport will be, for a finished game whose plays are not in D1 yet. */
export function ReplayPending({ gaveUp }: { gaveUp: boolean }) {
  return (
    <div data-slot="replay-pending" className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
      <Button className="w-16 max-sm:h-11 max-sm:w-20" disabled>
        play
      </Button>
      <p
        data-slot="replay-pending-note"
        className="min-w-0 flex-1 truncate text-foreground/50 max-sm:basis-full"
      >
        {gaveUp
          ? "The replay could not be made ready. Load the page again to try once more."
          : "The game is being saved. The replay is ready in a moment."}
      </p>
    </div>
  );
}
