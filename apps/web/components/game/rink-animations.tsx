"use client";

import { type RefObject, useEffect, useReducer, useRef } from "react";
import {
  queuePace,
  RINK_QUEUE_OPENED,
  type RinkScene,
  rinkQueueReducer,
} from "../../lib/game/rink-queue";

/** GSAP and what draws with it, fetched the first time a page has something to play. */
const loadPlayer = () => import("./rink-player");

/**
 * Plays the game on the drawn rink: the plays of a Game Stream as they arrive, and the play a
 * Replay's playhead (or a clicked tick) lands on. It is given what the page shows, the queue
 * (`lib/game/rink-queue.ts`) decides what that means for the ice, and `rink-player.ts` draws it.
 *
 * It renders nothing, so the queue moving on re-renders nothing either. A visitor who asked their
 * device for less motion gets each play as it ended, with nothing moving.
 */
export function RinkAnimations({
  rink,
  game,
  plays,
  homeTeamId,
  focusId,
  picked,
}: RinkScene & {
  /** The rink's `<svg>`. */
  rink: RefObject<SVGSVGElement | null>;
}) {
  const [queue, dispatch] = useReducer(rinkQueueReducer, RINK_QUEUE_OPENED);
  useEffect(() => {
    dispatch({ type: "scene", scene: { game, plays, homeTeamId, focusId, picked } });
  }, [game, plays, homeTeamId, focusId, picked]);

  // Read when a cue starts: more arriving behind it does not start it again.
  const pace = useRef(1);
  useEffect(() => {
    pace.current = queuePace(queue);
  }, [queue]);

  const { current } = queue;
  useEffect(() => {
    const root = rink.current;
    if (current == null || root == null) return;
    let left = false;
    let stop = () => {};
    const finished = () => dispatch({ type: "finished", cue: current });
    loadPlayer().then(
      (player) => {
        if (left) return;
        stop = player.playRinkCue(root, current, {
          reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
          pace: pace.current,
          onFinished: finished,
        });
      },
      // GSAP could not be fetched: the dots are still the game, and the queue moves on.
      finished,
    );
    return () => {
      left = true;
      stop();
    };
  }, [current, rink]);

  return null;
}
