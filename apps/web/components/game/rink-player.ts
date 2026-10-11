import { gsap } from "gsap";
import { RINK } from "../../lib/game/rink";
import type { RinkAnimation } from "../../lib/game/rink-animation";
import type { RinkCue } from "../../lib/game/rink-queue";

/*
 * GSAP plays a cue on the drawn rink (`rink.tsx`). This file is the only one that imports GSAP,
 * and `RinkAnimations` imports it lazily, so GSAP is fetched by a game page (as a live one opens,
 * or when a Replay first has something to play) and by no other page.
 *
 * It never sets what React sets. In the drawing that is the effects layer, the creases, the lamps
 * and the end zones, which React renders once and never changes, and a play's dot, scaled through
 * its `transform`. Outside it (a goal's sequence reaches the score, the clock and the caption) it
 * sets only `opacity` and `transform` on elements whose text and colours are React's, and data
 * attributes on elements React gives none. So a render in the middle of a timeline cannot fight
 * it, and `clearRink` puts everything back.
 */

/** Seconds a cue stays on the ice after it has played out before the next may take its place. */
const HOLD = 1.2;

const part = (root: SVGSVGElement, name: string) => root.querySelector(`[data-fx="${name}"]`);

function setAttributes(element: Element, attributes: Record<string, number>) {
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, String(value));
  }
}

/** The rink and everything laid over it (`GameRink`): the score and the clock are outside the `<svg>`. */
const gameRink = (root: SVGSVGElement) => root.closest('[data-slot="game-rink"]') ?? root;

/** The play's words, on the ice and under it (`game-rink.tsx`). */
const captions = (root: SVGSVGElement) =>
  gameRink(root).querySelectorAll('[data-slot="rink-caption"]');

/** The ice as React drew it: nothing of any animation left on it. */
export function clearRink(root: SVGSVGElement): void {
  gsap.set(root.querySelector('[data-slot="rink-fx"]'), { opacity: 0 });
  gsap.set(captions(root), { clearProps: "opacity,transform" });
  for (const crease of root.querySelectorAll('[data-slot="rink-crease"]')) {
    crease.removeAttribute("data-lit");
    gsap.set(crease, { clearProps: "strokeWidth" });
  }
  clearGoal(root);
}

/** Everything a goal's sequence touches, put back: no lamp, no tint, no score but the header's. */
function clearGoal(root: SVGSVGElement) {
  for (const lit of root.querySelectorAll('[data-slot="rink-lamp"], [data-slot="rink-net"]')) {
    lit.removeAttribute("data-lit");
  }
  for (const glow of root.querySelectorAll('[data-slot="rink-lamp-glow"]')) {
    gsap.set(glow, { clearProps: "opacity,strokeWidth" });
    glow.setAttribute("r", String(RINK.lampRadius));
  }
  for (const tint of root.querySelectorAll<SVGElement>('[data-slot="rink-tint"]')) {
    gsap.set(tint, { clearProps: "opacity" });
    tint.style.removeProperty("--tint");
    tint.style.removeProperty("--tint-dark");
  }
  // One at a time: GSAP warns in the console when it is handed a list with nothing in it, and a
  // Replay has no live marker, as a play that is no goal has no flag.
  const over = gameRink(root);
  for (const moved of over.querySelectorAll(
    `[data-fx="goal-kicker"], [data-fx="caption-part"], [data-fx="score-roll"], ${LIVE_MARKER}`,
  )) {
    gsap.set(moved, { clearProps: "opacity,transform" });
  }
  for (const before of over.querySelectorAll('[data-fx="score-before"]')) {
    before.removeAttribute("data-from");
  }
}

/** The "live" over the clock, which "GOAL" stands in for while a goal is on the ice. */
const LIVE_MARKER = '[data-slot="rink-status"] [data-slot="live-marker"]';

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
      return goal(root, animation, shot(root, animation));
    case "save":
    case "miss":
      return shot(root, animation);
  }
}

/** Seconds a shot's puck is in flight: every step of what follows it starts from here. */
const travelTime = (distance: number) => 0.28 + distance / 170;

/**
 * What a goal adds once its shot is in the net, as the approved prototype plays it: the lamp
 * behind the net comes on and throws three rings, the net lights, the scoring end floods with the
 * team's colour and settles to a tint, "GOAL" lands over centre ice, the score rolls up to its new
 * figure, and the caption's flag and scorer slide in. The lamp, the net and the tint stay as long
 * as the goal is on the ice.
 */
function goal(
  root: SVGSVGElement,
  { playId, end, distance, side, tint: colour, score }: Extract<RinkAnimation, { kind: "goal" }>,
  timeline: gsap.core.Timeline,
) {
  const at = (slot: string) => root.querySelector(`[data-slot="${slot}"][data-end="${end}"]`);
  const [lamp, glow, tint] = [at("rink-lamp"), at("rink-lamp-glow"), at("rink-tint")];
  const net = root.querySelector(
    `[data-slot="rink-goal"][data-end="${end}"] [data-slot="rink-net"]`,
  );
  const over = gameRink(root);
  const scored = travelTime(distance);

  timeline.call(
    () => {
      lamp?.setAttribute("data-lit", "");
      net?.setAttribute("data-lit", "");
    },
    undefined,
    scored,
  );
  if (glow) {
    timeline.fromTo(
      glow,
      { attr: { r: RINK.lampRadius }, opacity: 0.9, strokeWidth: 1.4 },
      {
        attr: { r: 12 },
        opacity: 0,
        strokeWidth: 0.2,
        duration: 0.7,
        repeat: 2,
        immediateRender: false,
      },
      scored,
    );
  }
  if (tint instanceof SVGElement) {
    if (colour) {
      tint.style.setProperty("--tint", colour.light);
      tint.style.setProperty("--tint-dark", colour.dark);
    }
    timeline
      .to(tint, { opacity: 0.55, duration: 0.12, ease: "none" }, scored)
      .to(tint, { opacity: 0.2, duration: 1.4 }, scored + 0.12);
  }

  const [kicker, marker] = [
    over.querySelector('[data-fx="goal-kicker"]'),
    over.querySelector(LIVE_MARKER),
  ];
  if (marker) timeline.to(marker, { opacity: 0, duration: 0.1 }, scored);
  if (kicker) {
    timeline.fromTo(
      kicker,
      { opacity: 0, scale: 1.8 },
      { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" },
      scored,
    );
  }

  // The figure is the header's, which ESPN may not have moved yet (or may have moved past this
  // goal): then there is nothing true to roll to, and the figure changes when the header does.
  const roll = over.querySelector(`[data-fx="score-roll"][data-side="${side}"]`);
  if (score && roll?.textContent?.trim() === String(score.to)) {
    roll.querySelector('[data-fx="score-before"]')?.setAttribute("data-from", String(score.from));
    timeline.fromTo(
      roll,
      { yPercent: 100 },
      { yPercent: 0, duration: 0.6, ease: "back.out(1.6)" },
      scored + 0.15,
    );
  }

  // The caption fades in and its flag and words slide up, one after the other. `GameRink` gives
  // the caption to the goal on the ice, whatever is in focus.
  const words = [...captions(root)].filter(
    (caption) => caption.getAttribute("data-play") === playId,
  );
  const parts = words.flatMap((caption) => [
    ...caption.querySelectorAll('[data-fx="caption-part"]'),
  ]);
  if (parts.length > 0) {
    timeline
      .fromTo(words, { opacity: 0 }, { opacity: 1, duration: 0.3 }, scored + 0.1)
      .fromTo(
        parts,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.3, stagger: 0.08 },
        scored + 0.1,
      );
  }
  return timeline;
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
  const travel = travelTime(distance);

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
    // The caption is the play in focus's: its words come in as the shot lands. (A goal brings
    // its own in, in focus or not: `goal`.)
    if (dot.hasAttribute("data-focused") && kind !== "goal") {
      timeline.fromTo(
        captions(root),
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.3 },
        travel + 0.1,
      );
    }
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
      );
    if (crease) {
      timeline
        .call(() => crease.setAttribute("data-lit", ""), undefined, travel)
        .fromTo(
          crease,
          { strokeWidth: 1.2 },
          { strokeWidth: 0.7, duration: 0.6, immediateRender: false },
          travel,
        );
    }
  } else if (kind === "miss") {
    timeline
      .to(puck, { opacity: 0, duration: 0.2 }, travel)
      .to(trail, { opacity: 0.6, duration: 0.6 }, travel + 0.1);
  }
  return timeline;
}
