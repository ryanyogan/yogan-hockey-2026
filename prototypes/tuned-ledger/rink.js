// PROTOTYPE (#128). The rink: production's SVG (apps/web/components/game/rink.tsx, drawn in feet
// with centre ice at the origin) plus what an animation needs to land on: a crease, a net and a
// goal lamp at each end, and a tint over each end zone.
//
// It is split the way the PRD (#123) plans the real thing: `describe` is a pure function from a
// play to an animation description, and `animate` plays a description with GSAP.

const RINK = {
  halfLength: 100,
  halfWidth: 42.5,
  corner: 28,
  blueLine: 25,
  goalLine: 89,
  circleX: 69,
  circleY: 22,
  circleRadius: 15,
  margin: 2,
};
const GOAL_LINE_REACH = 37;
const CREASE = 6;
/** The goal lamp sits on the boards behind the net, as it does on the glass in a real rink. */
const LAMP = 1.8;
const RADIUS = { focus: 5, goal: 3.2, play: 2 };

const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));
/** ESPN's y is positive up the drawing; the drawing's own y runs down. */
export const rinkPoint = ({ x, y }) => ({
  x: clamp(x, RINK.halfLength),
  y: clamp(0 - y, RINK.halfWidth),
});

/** As production's `markKind`: "save" is a shot on goal that was stopped. */
export function markKind(play) {
  if (play.scoring) return "goal";
  if (play.penalty) return "penalty";
  if (play.type === "shot-on-goal") return "save";
  if (play.type === "shot-missed" || play.type === "shot-blocked") return "shot";
  return "other";
}

/**
 * What to draw for a play, or null for one the rink does not animate.
 *
 * Only what ESPN records is drawn: where the shot was taken, and how it ended. A goal runs to the
 * net, a save stops at the edge of the crease, a miss runs wide of the post to the end boards. A
 * blocked shot is recorded where the blocker stood, not the shooter, so it has no line; a play
 * with no coordinate has none either.
 */
export function describe(play) {
  if (play.coordinate == null) return null;
  const kind = markKind(play);
  if (kind !== "goal" && kind !== "save" && !(kind === "shot" && play.type === "shot-missed")) {
    return null;
  }
  const from = rinkPoint(play.coordinate);
  const side = from.x >= 0 ? 1 : -1;
  const net = { x: side * RINK.goalLine, y: 0 };
  const [dx, dy] = [from.x - net.x, from.y - net.y];
  const distance = Math.hypot(dx, dy) || 1;
  let to;
  if (kind === "goal") to = { x: net.x + side * 1.6, y: 0 };
  else if (kind === "save") {
    const reach = Math.min(CREASE, distance);
    to = { x: net.x + (dx / distance) * reach, y: net.y + (dy / distance) * reach };
  } else to = { x: side * (RINK.halfLength - 3), y: from.y >= 0 ? -7 : 7 };
  return { kind, playId: play.id, end: side > 0 ? "right" : "left", from, to, distance };
}

const line = (name, x, reach, width, opacity) =>
  `<line data-line="${name}" x1="${x}" x2="${x}" y1="${-reach}" y2="${reach}" stroke-opacity="${opacity}" stroke-width="${width}"/>`;

/** The rink with a dot for each play in `marks`, the play in focus drawn last, larger and ringed. */
export function rinkSvg(marks, focus) {
  const { halfLength: L, halfWidth: W, corner, blueLine, goalLine, circleX, circleY } = RINK;
  const r = RINK.circleRadius;
  const m = RINK.margin;
  const dot = (play, focused) => {
    if (play.coordinate == null) return "";
    const { x, y } = rinkPoint(play.coordinate);
    const kind = markKind(play);
    const radius = focused ? RADIUS.focus : kind === "goal" ? RADIUS.goal : RADIUS.play;
    return `<circle class="dot k-${kind}${focused ? " focused" : ""}" data-play="${play.id}" cx="${x}" cy="${y}" r="${radius}"/>`;
  };
  const others = marks.filter((play) => play.id !== focus?.id);
  const ordered = [...others.filter((p) => !p.scoring), ...others.filter((p) => p.scoring)];
  const end = (side) => {
    const name = side > 0 ? "right" : "left";
    const x = side * goalLine;
    return `
      <path class="crease" data-end="${name}" d="M ${x} ${-CREASE} A ${CREASE} ${CREASE} 0 0 ${side > 0 ? 0 : 1} ${x} ${CREASE}"/>
      <rect class="net" data-end="${name}" x="${side > 0 ? x : x - 3.4}" y="-3" width="3.4" height="6"/>
      <circle class="lamp-glow" data-end="${name}" cx="${side * RINK.halfLength}" cy="0" r="${LAMP}"/>
      <circle class="lamp" data-end="${name}" cx="${side * RINK.halfLength}" cy="0" r="${LAMP}"/>`;
  };
  return `
    <svg class="rink" viewBox="${-L - m} ${-W - m} ${2 * (L + m)} ${2 * (W + m)}" role="img"
      aria-label="The rink, with a dot where each play happened">
      <defs><clipPath id="ice"><rect x="${-L}" y="${-W}" width="${2 * L}" height="${2 * W}" rx="${corner}"/></clipPath></defs>
      <rect class="boards" x="${-L}" y="${-W}" width="${2 * L}" height="${2 * W}" rx="${corner}"/>
      <g clip-path="url(#ice)">
        <rect class="tint" data-end="left" x="${-L}" y="${-W}" width="${L - blueLine}" height="${2 * W}"/>
        <rect class="tint" data-end="right" x="${blueLine}" y="${-W}" width="${L - blueLine}" height="${2 * W}"/>
      </g>
      <g class="red">
        ${line("centre", 0, W, 1, 0.6)}
        ${line("goal", -goalLine, GOAL_LINE_REACH, 0.5, 0.5)}
        ${line("goal", goalLine, GOAL_LINE_REACH, 0.5, 0.5)}
        ${[-circleX, circleX].flatMap((x) => [-circleY, circleY].map((y) => `<circle cx="${x}" cy="${y}" r="${r}" stroke-opacity="0.35"/>`)).join("")}
      </g>
      <g class="blue">
        ${line("blue", -blueLine, W, 1.2, 0.6)}
        ${line("blue", blueLine, W, 1.2, 0.6)}
        <circle r="${r}" stroke-opacity="0.45"/>
      </g>
      ${end(-1)}${end(1)}
      <g class="marks">${ordered.map((play) => dot(play, false)).join("")}${focus ? dot(focus, true) : ""}</g>
      <g class="fx" opacity="0">
        <line class="trail" pathLength="1" stroke-dasharray="1"/>
        <line class="stop"/>
        <circle class="pulse" cx="0" cy="0" r="1"/>
        <circle class="puck" cx="0" cy="0" r="1.3"/>
      </g>
    </svg>`;
}

let running = null;

/**
 * Plays a description on a freshly rendered rink. The page is already drawn in the play's end
 * state (the new score, the caption, the play's dot); the timeline starts from before it and runs
 * up to it. With `reduced` the timeline is jumped to its end, so reduced motion shows exactly the
 * end state and nothing moves.
 */
export function animate(root, description, { reduced, tint }) {
  const gsap = window.gsap;
  running?.kill();
  const one = (selector) => root.querySelector(selector);
  const { kind, from, to, end } = description;
  const travel = 0.28 + description.distance / 170;
  const [fx, trail, puck, stop, pulse] = [".fx", ".trail", ".puck", ".stop", ".pulse"].map(one);
  const dot = one(`.dot[data-play="${description.playId}"]`);
  const words = [one(".caption .flag"), one(".caption .words")];

  trail.setAttribute("class", `trail k-${kind}`);
  stop.setAttribute("class", `stop k-${kind}`);
  for (const [name, value] of Object.entries({ x1: from.x, y1: from.y, x2: to.x, y2: to.y })) {
    trail.setAttribute(name, value);
  }

  const timeline = gsap.timeline({ defaults: { ease: "power2.out" } });
  timeline
    .set(fx, { opacity: 1 })
    .from(dot, { attr: { r: 0 }, duration: 0.25, ease: "back.out(3)" }, 0)
    .fromTo(
      trail,
      { strokeDashoffset: 1, opacity: 1 },
      { strokeDashoffset: 0, duration: travel, ease: "power1.in" },
      0,
    )
    .fromTo(
      puck,
      { attr: { cx: from.x, cy: from.y }, opacity: 1 },
      { attr: { cx: to.x, cy: to.y }, duration: travel, ease: "power1.in" },
      0,
    )
    .from(words, { opacity: 0, y: 6, duration: 0.3, stagger: 0.05 }, travel + 0.1);

  if (kind === "goal") {
    const at = (selector) => one(`${selector}[data-end="${end}"]`);
    const live = getComputedStyle(root).getPropertyValue("--live").trim();
    const roll = one(".over-side.scored .roll");
    timeline
      // The lamp comes on and stays on; its glow beats three times.
      .to(at(".lamp"), { fill: live, stroke: live, duration: 0.05 }, travel)
      .fromTo(
        at(".lamp-glow"),
        { attr: { r: LAMP }, opacity: 0.9, strokeWidth: 1.4 },
        { attr: { r: 12 }, opacity: 0, strokeWidth: 0.2, duration: 0.7, repeat: 2 },
        travel,
      )
      .to(at(".net"), { stroke: live, strokeWidth: 1, duration: 0.1 }, travel)
      // The scoring end floods with the team's colour, then settles to a tint that stays.
      .set(at(".tint"), { fill: tint }, 0)
      .to(at(".tint"), { opacity: 0.55, duration: 0.12, ease: "none" }, travel)
      .to(at(".tint"), { opacity: 0.2, duration: 1.4 }, travel + 0.12)
      .from(
        one(".over-status .kicker"),
        { opacity: 0, scale: 1.8, duration: 0.3, ease: "back.out(2)" },
        travel,
      )
      .fromTo(
        roll,
        { yPercent: 0 },
        { yPercent: -50, duration: 0.6, ease: "back.out(1.6)" },
        travel + 0.15,
      );
  } else if (kind === "save") {
    // A bar across the shot where the goalie met it, and one ring. The puck stays there.
    const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    const [nx, ny] = [(-(to.y - from.y) / length) * 2.6, ((to.x - from.x) / length) * 2.6];
    for (const [name, value] of Object.entries({
      x1: to.x - nx,
      y1: to.y - ny,
      x2: to.x + nx,
      y2: to.y + ny,
    })) {
      stop.setAttribute(name, value);
    }
    pulse.setAttribute("cx", to.x);
    pulse.setAttribute("cy", to.y);
    const save = getComputedStyle(root).getPropertyValue("--m-save").trim();
    timeline
      .fromTo(stop, { opacity: 0 }, { opacity: 1, duration: 0.08 }, travel)
      .fromTo(
        pulse,
        { attr: { r: 1 }, opacity: 0.9, stroke: save, strokeWidth: 1 },
        { attr: { r: 9 }, opacity: 0, strokeWidth: 0.2, duration: 0.6 },
        travel,
      )
      .fromTo(
        one(`.crease[data-end="${end}"]`),
        { stroke: save, strokeOpacity: 1, strokeWidth: 1.2 },
        { strokeWidth: 0.7, duration: 0.6 },
        travel,
      );
  } else {
    // Wide: the puck is gone at the boards and the line fades back, a miss among the dots.
    timeline
      .set(stop, { opacity: 0 }, 0)
      .to(puck, { opacity: 0, duration: 0.2 }, travel)
      .to(trail, { opacity: 0.6, duration: 0.6 }, travel + 0.1);
  }

  if (reduced) timeline.progress(1);
  running = timeline;
  return timeline;
}
