import { gsap } from "gsap";
import type { RinkAnimation } from "../../lib/game/rink-animation";
import type { RinkCue } from "../../lib/game/rink-queue";

/*
 * GSAP plays a cue on the drawn rink (`rink.tsx`). This file is the only one that imports GSAP,
 * and `RinkAnimations` imports it lazily, so GSAP is fetched when a game page first has something
 * to play and by no other page.
 *
 * It draws only in the effects layer and on the creases, which React renders once and never
 * changes, and scales a play's dot through its `transform`, which React does not set. So a render
 * in the middle of a timeline cannot fight it, and `clearRink` puts everything back.
 */

/** Seconds a cue stays on the ice after it has played out before the next may take its place. */
const HOLD = 1.2;

const part = (root: SVGSVGElement, name: string) => root.querySelector(`[data-fx="${name}"]`);

function setAttributes(element: Element, attributes: Record<string, number>) {
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, String(value));
  }
}

/** The ice as React drew it: nothing of any animation left on it. */
export function clearRink(root: SVGSVGElement): void {
  gsap.set(root.querySelector('[data-slot="rink-fx"]'), { opacity: 0 });
  for (const crease of root.querySelectorAll('[data-slot="rink-crease"]')) {
    crease.removeAttribute("data-lit");
    gsap.set(crease, { clearProps: "strokeWidth" });
  }
}

/**
 * Plays `cue` in place of whatever was on the ice, and calls `onFinished` once it has played out
 * and been held a moment. Returns a function that stops it where it would have ended.
 *
 * The timeline is built up to the play's end state, so `reduced` (the visitor asked their device
 * for less motion) is the same timeline jumped to its last frame: the same picture, nothing
 * moving. `pace` plays it that many times faster, for a queue with more waiting.
 */
export function playRinkCue(
  root: SVGSVGElement,
  cue: RinkCue,
  { reduced, pace, onFinished }: { reduced: boolean; pace: number; onFinished: () => void },
): () => void {
  clearRink(root);
  if (cue.kind === "clear") return () => {};

  const timeline = timelineFor(root, cue);
  if (reduced) timeline.progress(1);
  else timeline.timeScale(pace);
  const moving = reduced ? 0 : timeline.duration();
  const finish = gsap.delayedCall((moving + HOLD) / pace, onFinished);
  return () => {
    finish.kill();
    timeline.progress(1).kill();
  };
}

/** One timeline per kind of `RinkAnimation`: the goal sequence and penalties add theirs here. */
function timelineFor(root: SVGSVGElement, animation: RinkAnimation): gsap.core.Timeline {
  switch (animation.kind) {
    case "goal":
    case "save":
    case "miss":
      return shot(root, animation);
  }
}

/**
 * A line drawn from where the shot was taken, with the puck on it, and the play's dot popping in.
 * A goal's reaches the net. A save's stops at the crease, with a bar across it, one ring, and the
 * crease lit. A miss's runs wide to the boards, where the puck goes and the line fades back.
 */
function shot(root: SVGSVGElement, { kind, playId, end, from, to, distance }: RinkAnimation) {
  const fx = root.querySelector('[data-slot="rink-fx"]');
  const [trail, puck, stop, pulse] = [
    part(root, "trail"),
    part(root, "puck"),
    part(root, "stop"),
    part(root, "pulse"),
  ];
  const timeline = gsap.timeline({ defaults: { ease: "power2.out" } });
  if (!fx || !trail || !puck || !stop || !pulse) return timeline;
  const dot = root.querySelector(`[data-slot="rink-mark"][data-play="${CSS.escape(playId)}"]`);
  const travel = 0.28 + distance / 170;

  fx.setAttribute("data-kind", kind);
  setAttributes(trail, { x1: from.x, y1: from.y });
  gsap.set(fx, { opacity: 1 });
  gsap.set([stop, pulse], { opacity: 0 });

  // The line's far end and the puck move together. (Drawing the line with a dash offset does not
  // work: GSAP rounds a style in px, and the offset of a path one unit long is all or nothing.)
  timeline
    .fromTo(
      trail,
      { attr: { x2: from.x, y2: from.y }, opacity: 1 },
      { attr: { x2: to.x, y2: to.y }, duration: travel, ease: "power1.in" },
      0,
    )
    .fromTo(
      puck,
      { attr: { cx: from.x, cy: from.y }, opacity: 1 },
      { attr: { cx: to.x, cy: to.y }, duration: travel, ease: "power1.in" },
      0,
    );
  if (dot) {
    timeline.fromTo(
      dot,
      { scale: 0, svgOrigin: `${from.x} ${from.y}` },
      { scale: 1, duration: 0.25, ease: "back.out(3)" },
      0,
    );
  }

  if (kind === "save") {
    // The bar lies across the shot's line where the goalie met it. The puck stays there.
    const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    const [acrossX, acrossY] = [
      (-(to.y - from.y) / length) * 2.6,
      ((to.x - from.x) / length) * 2.6,
    ];
    setAttributes(stop, {
      x1: to.x - acrossX,
      y1: to.y - acrossY,
      x2: to.x + acrossX,
      y2: to.y + acrossY,
    });
    setAttributes(pulse, { cx: to.x, cy: to.y });
    const crease = root.querySelector(
      `[data-slot="rink-goal"][data-end="${end}"] [data-slot="rink-crease"]`,
    );
    timeline
      .to(stop, { opacity: 1, duration: 0.08 }, travel)
      .fromTo(
        pulse,
        { attr: { r: 1 }, opacity: 0.9, strokeWidth: 1 },
        { attr: { r: 9 }, opacity: 0, strokeWidth: 0.2, duration: 0.6, immediateRender: false },
        travel,
      )
      .call(() => crease?.setAttribute("data-lit", ""), undefined, travel)
      .fromTo(
        crease,
        { strokeWidth: 1.2 },
        { strokeWidth: 0.7, duration: 0.6, immediateRender: false },
        travel,
      );
  } else if (kind === "miss") {
    timeline
      .to(puck, { opacity: 0, duration: 0.2 }, travel)
      .to(trail, { opacity: 0.6, duration: 0.6 }, travel + 0.1);
  }
  return timeline;
}
