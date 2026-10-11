// The rink's animations in a real browser: screenshots for docs/design/rink-animations, and a
// report of what was on the ice at each step, which is how #141's acceptance was checked.
//
//   node scripts/rink-shots.ts [baseURL] [outDir] [shots|goal|penalties]
//
// Needs a dev server in fixture mode (ESPN_FIXTURES=1) and TMPDIR set (see the build notes). The
// Replay is the recorded shootout (401803652); the Game Stream is the same plays sent to the one
// recorded game still to be played, with the smoke test's driver (e2e/game-driver.ts).
import { chromium, type Page } from "@playwright/test";
import {
  driveGame,
  RECORDED_GAME,
  type RecordedPlay,
  recordedGame,
  SCHEDULED_GAME,
} from "../e2e/game-driver.ts";

const [baseURL = "http://localhost:5313", outDir = "docs/design/rink-animations", only] =
  process.argv.slice(2);
/** A third argument runs one part: "shots" (#141's), "goal" (#142's) or "penalties" (#143's). */
const wants = (part: "shots" | "goal" | "penalties") => only == null || only === part;

const game = await recordedGame(baseURL);
type Located = RecordedPlay & { coordinate: { x: number; y: number } | null; scoring: boolean };
const plays = game.plays as Located[];
const located = (wanted: (play: Located) => boolean, from = 0) => {
  const found = plays.find((play, at) => at >= from && play.coordinate != null && wanted(play));
  if (!found) throw new Error("The recorded game has no such play");
  return found;
};
const label = (play: RecordedPlay) =>
  `${play.periodText === "SO" ? "SO" : `${play.periodText} ${play.clock}`} ${play.text}`;

/** What an animation has drawn, read from the page. */
const ice = (page: Page) =>
  page.evaluate(() => {
    const fx = document.querySelector<SVGGElement>('[data-slot="rink-fx"]');
    const trail = fx?.querySelector<SVGLineElement>('[data-fx="trail"]');
    const style = (element: Element | null | undefined, name: string) =>
      element ? getComputedStyle(element).getPropertyValue(name) : null;
    return {
      shown: style(fx, "opacity") === "1",
      kind: fx?.getAttribute("data-kind") ?? null,
      from: trail ? `${trail.getAttribute("x1")},${trail.getAttribute("y1")}` : null,
      to: trail ? `${trail.getAttribute("x2")},${trail.getAttribute("y2")}` : null,
      litCreases: document.querySelectorAll('[data-slot="rink-crease"][data-lit]').length,
      focus: document
        .querySelector('[data-slot="rink-mark"][data-focused]')
        ?.getAttribute("data-play"),
    };
  });

/** Layout shift from here on: `shiftSeen` reads the total. Nothing here counts as the visitor's input. */
const watchShift = (page: Page) =>
  page.evaluate(() => {
    const seen = { shift: 0 };
    Object.assign(window, { shiftSeen: seen });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        seen.shift += (entry as PerformanceEntry & { value: number }).value;
      }
    }).observe({ type: "layout-shift" });
  });
const shiftSeen = async (page: Page) => {
  await page.waitForTimeout(300);
  return page.evaluate(
    () => (window as unknown as { shiftSeen: { shift: number } }).shiftSeen.shift,
  );
};
/** The same page with nothing to play its animations: what the page shifts by itself. */
const withoutPlayer = (page: Page) => page.route(/rink-player/, (route) => route.abort());

const browser = await chromium.launch();
const report: Record<string, unknown> = {};

async function open(scheme: "light" | "dark", width: number, reducedMotion = false) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    deviceScaleFactor: width < 500 ? 2 : 1,
    colorScheme: scheme,
    reducedMotion: reducedMotion ? "reduce" : "no-preference",
    timezoneId: "America/Chicago",
  });
  await context.addInitScript((theme) => localStorage.setItem("theme", theme), scheme);
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(String(error)));
  return { page, errors };
}

/** The Replay with every play listed, so a miss can be stepped onto. */
async function openReplay(page: Page) {
  await page.goto(`${baseURL}/nhl/games/${RECORDED_GAME}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.locator('[data-slot="replay-transport"]').waitFor();
  // A click before the page has hydrated does nothing, so click until the list answers.
  for (let tries = 0; tries < 20; tries++) {
    await page.locator("label", { hasText: /^every play/ }).click();
    if ((await page.locator('[data-slot="timeline-tick"]').count()) > 300) break;
    await page.waitForTimeout(250);
  }
}
const stepTo = (page: Page, play: RecordedPlay) =>
  page
    .locator(`[data-slot="timeline-tick"][aria-label=${JSON.stringify(label(play))}]`)
    .first()
    .dispatchEvent("click");
const rinkShot = (page: Page, name: string) =>
  page.locator('[data-slot="game-rink"]').screenshot({ path: `${outDir}/${name}.png` });

/** What a goal's sequence has left on the page: lamps, tints, "GOAL", each score and the caption. */
const goalIce = (page: Page) =>
  page.evaluate(() => {
    const all = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)];
    const opacity = (element: Element) => Number(getComputedStyle(element).opacity);
    const shown = (element: HTMLElement) => element.getClientRects().length > 0;
    return {
      litLamps: all('[data-slot="rink-lamp"][data-lit]').map((lamp) => lamp.dataset.end),
      litNets: all('[data-slot="rink-net"][data-lit]').length,
      tints: all('[data-slot="rink-tint"]')
        .filter((tint) => opacity(tint) > 0)
        .map((tint) => `${tint.dataset.end} ${opacity(tint)} ${getComputedStyle(tint).fill}`),
      // The power play beside it: the ends ruled (and how strongly), and how many sit in the box.
      ruled: all('[data-slot="rink-power-play-zone"][data-on]').map(
        (zone) => `${zone.dataset.end} ${opacity(zone)}`,
      ),
      boxed: all('[data-slot="boxed-penalty"]').length,
      kicker: all('[data-fx="goal-kicker"]').map(opacity),
      liveMarker: all('[data-slot="rink-status"] [data-slot="live-marker"]').map(opacity),
      scores: all('[data-fx="score-roll"]').map((roll) => {
        const before = roll.querySelector<HTMLElement>('[data-fx="score-before"]');
        const moved = new DOMMatrix(getComputedStyle(roll).transform).m42;
        return `${roll.dataset.side} ${roll.textContent}${
          before?.dataset.from == null ? "" : `, ${before.dataset.from} written above`
        }${moved === 0 ? "" : `, moved ${moved.toFixed(1)}px`}`;
      }),
      caption: all('[data-slot="rink-caption"]')
        .filter(shown)
        .map(
          (caption) =>
            `${caption.innerText.replaceAll("\n", " | ")} (opacity ${[
              caption,
              ...caption.querySelectorAll('[data-fx="caption-part"]'),
            ]
              .map(opacity)
              .join(", ")})`,
        ),
    };
  });

/**
 * Every figure a score has shown, sampled each frame: the header's, or the one written above it
 * while the roll has that in the window. `scoresSeen` reads it.
 */
const watchScores = (page: Page) =>
  page.evaluate(() => {
    const seen: string[] = [];
    Object.assign(window, { scoresSeen: seen });
    const sample = () => {
      const now = [...document.querySelectorAll<HTMLElement>('[data-fx="score-roll"]')]
        .map((roll) => {
          const moved = new DOMMatrix(getComputedStyle(roll).transform).m42;
          const before = roll.querySelector<HTMLElement>('[data-fx="score-before"]')?.dataset.from;
          const lit = document.querySelectorAll('[data-slot="rink-lamp"][data-lit]').length;
          const figure = moved > roll.offsetHeight / 2 ? before : roll.textContent;
          return `${roll.dataset.side} ${figure}${lit ? " lamp" : ""}`;
        })
        .join(", ");
      if (seen.at(-1) !== now) seen.push(now);
      requestAnimationFrame(sample);
    };
    sample();
  });
const scoresSeen = (page: Page) =>
  page.evaluate(() => (window as unknown as { scoresSeen: string[] }).scoresSeen);

/**
 * The goal sequence (#142): its end state and frames of it in flight in a Replay, stepped onto
 * forwards and backwards; with reduced motion; and in a Game Stream, where a goal arrives, is
 * given to another scorer, is overturned, and a shootout's goal leaves the score alone.
 */
async function goalSequence() {
  const named = (words: string) => {
    const found = plays.find((play) => play.text.includes(words));
    if (!found) throw new Error(`The recorded game has no "${words}"`);
    return found;
  };
  // A power-play goal by the away team, a goal by the home team (whose navy is lifted on slate),
  // a short-handed one and a shootout's.
  const powerPlay = named("Esa Lindell Goal");
  const home = named("Josh Norris Goal (13)");
  const shortHanded = named("Zach Benson Goal");
  const shootout = plays.find((play) => play.scoring && play.periodText === "SO");
  if (!shootout) throw new Error("The recorded game has no shootout goal");
  const played = 3600;

  for (const scheme of ["light", "dark"] as const) {
    for (const width of [1440, 390]) {
      const { page, errors } = await open(scheme, width);
      await openReplay(page);
      const flights = scheme === "dark" && width === 1440;
      await stepTo(page, powerPlay);
      for (const frame of flights ? [1, 2, 3, 4, 5, 6] : []) {
        await page.waitForTimeout(170);
        await rinkShot(page, `goal-in-flight-${frame}`);
      }
      await page.waitForTimeout(played);
      await rinkShot(page, `goal-${width}-${scheme}`);
      report[`goal, replay ${scheme} ${width}`] = await goalIce(page);
      await stepTo(page, home);
      await page.waitForTimeout(played);
      await rinkShot(page, `goal-home-${width}-${scheme}`);
      report[`goal by the home team, replay ${scheme} ${width}`] = await goalIce(page);
      if (errors.length > 0) report[`goal errors ${scheme} ${width}`] = errors;
      await page.close();
    }
  }

  // Stepped onto forwards and backwards, and off again: what is left each time. Then the same
  // steps with nothing to play them, for the layout shift.
  for (const animated of [true, false]) {
    const { page, errors } = await open("dark", 1440);
    if (!animated) await withoutPlayer(page);
    await openReplay(page);
    await watchShift(page);
    const steps: unknown[] = [];
    for (const [name, play] of [
      ["forwards to a save", save],
      ["forwards to the power-play goal", powerPlay],
      ["backwards to the short-handed goal", shortHanded],
      ["backwards to the home team's goal", home],
      ["forwards to a faceoff", faceoff],
      ["forwards to a shootout goal", shootout],
      ["backwards to a save", save],
    ] as const) {
      await stepTo(page, play);
      await page.waitForTimeout(played);
      steps.push({ step: name, ...(await ice(page)), ...(await goalIce(page)) });
    }
    await page.getByRole("button", { name: "whole game" }).click();
    await page.waitForTimeout(300);
    steps.push({ step: "back to the whole game", ...(await goalIce(page)) });
    if (animated) {
      report["goal, replay steps"] = steps;
      report["goal, replay errors"] = errors;
    }
    report[`goal, replay layout shift, ${animated ? "animated" : "no animations"}`] =
      await shiftSeen(page);
    await page.close();
  }

  // Reduced motion: the new score, the scorer, the lamp and the tint at once, nothing moving.
  for (const width of [1440, 390]) {
    const { page } = await open("light", width, true);
    await openReplay(page);
    await stepTo(page, save);
    await page.waitForTimeout(300);
    await watchScores(page);
    await stepTo(page, powerPlay);
    await page.locator('[data-slot="rink-lamp"][data-lit]').waitFor();
    const atOnce = await goalIce(page);
    await rinkShot(page, `goal-reduced-motion-${width}`);
    await page.waitForTimeout(1500);
    report[`goal, reduced motion ${width}`] = {
      atOnce,
      later: await goalIce(page),
      scoresSeen: await scoresSeen(page),
    };
    await page.close();
  }

  // A Game Stream. The scheduled game's teams play the recorded game: Nashville is Dallas.
  const stream = async (through: RecordedPlay, period: number, width = 1440, animated = true) => {
    const { page, errors } = await open("dark", width);
    if (!animated) await withoutPlayer(page);
    const driver = await driveGame(page, SCHEDULED_GAME);
    const at = plays.indexOf(through as Located);
    const state = (count: number) => ({
      header: game.liveAfter(count, period),
      delayed: false,
      archived: false,
    });
    await page.goto(`${baseURL}/nhl/games/${SCHEDULED_GAME}`, { waitUntil: "networkidle" });
    driver.agent(state(at), plays.slice(0, at));
    await driver.scoreboard({ status: "live", period, clock: "4:24" });
    await page.locator('[data-slot="game-view"]').waitFor();
    await page.waitForTimeout(500);
    await watchShift(page);
    await watchScores(page);
    /** The header and the play in the same instant, as one poll of ESPN sends them. */
    const arrives = () => {
      driver.message({ type: "cf_agent_state", state: state(at + 1) });
      driver.message({ type: "play-added", index: at, play: plays[at] });
    };
    return { page, errors, driver, at, state, arrives };
  };

  for (const [width, animated] of [
    [1440, true],
    [390, true],
    [1440, false],
  ] as const) {
    const { page, errors, driver, at, state, arrives } = await stream(
      powerPlay,
      2,
      width,
      animated,
    );
    const steps: unknown[] = [{ step: "following, before the goal", ...(await goalIce(page)) }];
    arrives();
    for (const frame of animated && width === 1440 ? [1, 2, 3, 4, 5, 6] : []) {
      await page.waitForTimeout(170);
      await rinkShot(page, `goal-live-in-flight-${frame}`);
    }
    await page.waitForTimeout(played);
    if (animated) await rinkShot(page, `goal-live-${width}-dark`);
    steps.push({ step: "a power-play goal arrived", ...(await goalIce(page)) });

    // ESPN gives the goal to somebody else.
    const credited = {
      ...plays[at],
      text: String(plays[at]?.text).replace("Esa Lindell", "Jamie Benn"),
      participants: [{ athleteId: "1", name: "Jamie Benn", shortName: "J. Benn", role: "scorer" }],
    };
    driver.message({ type: "play-changed", index: at, play: credited });
    await page.waitForTimeout(played);
    steps.push({ step: "the goal given to another scorer", ...(await goalIce(page)) });

    // The goal is overturned: the play is taken back and the header's score with it.
    driver.message({ type: "cf_agent_state", state: state(at) });
    driver.message({ type: "play-removed", id: plays[at]?.id });
    await page.waitForTimeout(600);
    if (animated) await rinkShot(page, `goal-overturned-${width}-dark`);
    steps.push({ step: "the goal overturned", ...(await ice(page)), ...(await goalIce(page)) });
    steps.push({ scoresSeen: await scoresSeen(page) });
    const run = `goal, stream ${width}${animated ? "" : ", no animations"}`;
    if (animated) {
      report[run] = steps;
      report[`${run} errors`] = errors;
    }
    report[`${run} layout shift`] = await shiftSeen(page);
    await page.close();
  }

  // A goal and the plays after it in one poll: the latest play is in focus, the goal is named.
  {
    const { page, driver, at, state } = await stream(powerPlay, 2);
    driver.message({ type: "cf_agent_state", state: state(at + 3) });
    for (const index of [at, at + 1, at + 2]) {
      driver.message({ type: "play-added", index, play: plays[index] });
    }
    await page.waitForTimeout(played);
    await rinkShot(page, "goal-live-with-later-plays");
    const playing = { ...(await ice(page)), ...(await goalIce(page)) };
    // Played out, with the game already past it: the goal is taken off the ice.
    await page.waitForTimeout(2500);
    report["goal, arriving with the plays after it"] = {
      later: [plays[at + 1]?.text, plays[at + 2]?.text],
      playing,
      playedOut: await goalIce(page),
      scoresSeen: await scoresSeen(page),
    };
    await page.close();
  }

  // A goal overturned while its sequence is still playing.
  {
    const { page, driver, at, state, arrives } = await stream(powerPlay, 2);
    arrives();
    await page.waitForTimeout(900);
    const during = await goalIce(page);
    driver.message({ type: "cf_agent_state", state: state(at) });
    driver.message({ type: "play-removed", id: plays[at]?.id });
    await page.waitForTimeout(600);
    report["goal, overturned mid-sequence"] = {
      during,
      after: await goalIce(page),
      scoresSeen: await scoresSeen(page),
    };
    await page.close();
  }

  // The header a poll behind the play: nothing true to roll to, so nothing rolls.
  {
    const { page, driver, at, state } = await stream(powerPlay, 2);
    driver.message({ type: "play-added", index: at, play: plays[at] });
    await page.waitForTimeout(played);
    const lagging = await goalIce(page);
    driver.message({ type: "cf_agent_state", state: state(at + 1) });
    await page.waitForTimeout(400);
    report["goal, the header's score arriving late"] = {
      lagging,
      caughtUp: await goalIce(page),
      scoresSeen: await scoresSeen(page),
    };
    await page.close();
  }

  // A save and a goal in one poll: the goal waits its turn, and its score with it.
  {
    const { page, errors, driver, at, state } = await stream(powerPlay, 2);
    driver.message({ type: "cf_agent_state", state: state(at + 1) });
    driver.message({ type: "play-added", index: at, play: { ...save, id: "save-first" } });
    driver.message({ type: "play-added", index: at + 1, play: plays[at] });
    await page.waitForTimeout(500);
    const waiting = await goalIce(page);
    await page.waitForTimeout(2 * played);
    report["goal, waiting behind a save from the same poll"] = {
      waiting: waiting.scores,
      after: await goalIce(page),
      scoresSeen: await scoresSeen(page),
      errors,
    };
    await page.close();
  }

  // Two goals for one side in one poll: the score stops at the first before rolling to the second.
  {
    const { page, errors, driver, at, state } = await stream(powerPlay, 2);
    const first = plays[at] as Located & { homeScore: number; awayScore: number };
    const before = plays[at - 1] as typeof first;
    const side = first.homeScore > before.homeScore ? "home" : "away";
    const second = { ...first, id: "second-goal", [`${side}Score`]: first[`${side}Score`] + 1 };
    const { header, ...rest } = state(at + 1);
    const scored = header as unknown as Record<string, { score: number | string }>;
    const now = scored[side]?.score;
    const counted = {
      ...header,
      [side]: {
        ...scored[side],
        score: typeof now === "string" ? String(+now + 1) : Number(now) + 1,
      },
    };
    driver.message({ type: "cf_agent_state", state: { ...rest, header: counted } });
    driver.message({ type: "play-added", index: at, play: first });
    driver.message({ type: "play-added", index: at + 1, play: second });
    await page.waitForTimeout(3 * played);
    report["goal, two for one side in one poll"] = {
      after: await goalIce(page),
      scoresSeen: await scoresSeen(page),
      errors,
    };
    await page.close();
  }

  // A goal on a major's power play: the advantage outlasts the goal, and the scoring end is the
  // ruled one. The tint has the end to itself while the goal is on the ice.
  {
    const { page, errors, driver, at, arrives } = await stream(powerPlay, 2);
    const called = plays.findLastIndex((play, index) => index < at && play.penalty === true);
    // The Scoreboard's clock is what is left of the period: 15:36 is the goal's 4:24.
    await driver.scoreboard({ status: "live", period: 2, clock: "15:36" });
    driver.message({
      type: "play-changed",
      index: called,
      play: { ...plays[called], penaltyMinutes: 5, typeText: "Major" },
    });
    await page.waitForTimeout(900);
    const before = await goalIce(page);
    arrives();
    await page.waitForTimeout(played);
    await rinkShot(page, "goal-on-a-major-power-play");
    const scored = await goalIce(page);
    // The game goes on: the goal is cleared and the ruling comes back.
    driver.message({ type: "play-added", index: at + 1, play: plays[at + 1] });
    await page.waitForTimeout(1200);
    report["goal, on a major's power play"] = {
      before: { ruled: before.ruled, boxed: before.boxed, tints: before.tints },
      scored: { ruled: scored.ruled, boxed: scored.boxed, tints: scored.tints },
      movedOn: await goalIce(page),
      errors,
    };
    await page.close();
  }

  // A shootout's goal: the whole sequence but the roll, and the score where it was.
  {
    const { page, errors, arrives } = await stream(shootout, 5);
    const before = await goalIce(page);
    arrives();
    await page.waitForTimeout(played);
    await rinkShot(page, "goal-shootout-live");
    report["goal, shootout in a stream"] = {
      before: before.scores,
      after: await goalIce(page),
      scoresSeen: await scoresSeen(page),
      errors,
    };
    await page.close();
  }
}

const save = located((play) => play.type === "shot-on-goal", 40);
const miss = located((play) => play.type === "shot-missed", 40);
const goal = located((play) => play.scoring);
const faceoff = located((play) => play.type === "faceoff", 60);
const nowhere = { ...save, id: "nowhere", coordinate: null };

if (wants("goal")) await goalSequence();

// Penalties and the power play (#143), in docs/design/penalties: a Game Stream given one penalty,
// the goal that ends it, two to one team and then one to the other; and a Replay stepped across
// the recorded game's penalties. `node scripts/rink-shots.ts <url> <outDir> penalties` runs only this.
if (wants("penalties")) {
  const penaltyShot = (page: Page, name: string) =>
    page
      .locator('[data-slot="game-rink"]')
      .screenshot({ path: `docs/design/penalties/${name}.png` });
  /** Who is in the box and what the ice is ruled with, read from the page. */
  const box = (page: Page) =>
    page.evaluate(() => {
      const text = (selector: string) =>
        [...document.querySelectorAll(selector)].map((each) =>
          (each.textContent ?? "").replace(/\s+/g, " ").trim(),
        );
      const zone = document.querySelector('[data-slot="rink-power-play-zone"][data-on]');
      return {
        status: text('[data-slot="rink-status"]')[0],
        box: text('[data-slot="boxed-penalty"]'),
        strength: text('[data-slot="power-play"], [data-slot="strength"]')[0] ?? null,
        ruledEnd: zone?.getAttribute("data-end") ?? null,
        // A goal's sequence beside it: the lamps lit and the ends tinted.
        litLamps: document.querySelectorAll('[data-slot="rink-lamp"][data-lit]').length,
        tinted: document.querySelectorAll('[data-slot="rink-tint"][data-lit]').length,
        boxHeight: document.querySelector('[data-slot="penalty-box"]')?.getBoundingClientRect()
          .height,
      };
    });
  const first = plays.findIndex((play) => play.penalty === true && play.period === 2);
  const called = plays[first] as Located;
  const powerPlayGoal = plays.find(
    (play, at) => at > first && play.scoring && play.teamId !== called.teamId,
  ) as Located;
  const other = plays.find((play) => play.penalty === true && play.teamId !== called.teamId);
  const penalty = (id: string, from: Located, clock: string, name: string, over = {}) => ({
    ...from,
    id,
    period: 2,
    periodText: "2nd",
    clock,
    participants: [{ athleteId: name, name, shortName: name, role: null }],
    ...over,
    text: `${name} ${(over as { typeText?: string }).typeText ?? from.typeText}`,
  });
  const scenes = [
    { name: "single", add: [called], clock: "17:00" },
    { name: "cleared-by-goal", add: [{ ...powerPlayGoal, id: "pp-goal", clock: "3:10" }] },
    {
      name: "two-to-one-team",
      add: [
        penalty("second", called, "5:00", "T. Thompson"),
        penalty("third", called, "5:30", "R. Dahlin", {
          typeText: "Delaying Game - Puck over Glass",
        }),
      ],
    },
    {
      name: "both-teams",
      add: [
        penalty("fourth", other as Located, "5:40", "J. Robertson"),
        penalty("fifth", other as Located, "5:40", "J. Robertson", {
          typeText: "Misconduct",
          penaltyMinutes: 10,
        }),
      ],
    },
  ];
  for (const scheme of ["light", "dark"] as const) {
    for (const width of [1440, 390]) {
      const { page, errors } = await open(scheme, width);
      const driver = await driveGame(page, SCHEDULED_GAME);
      await page.goto(`${baseURL}/nhl/games/${SCHEDULED_GAME}`, { waitUntil: "networkidle" });
      driver.agent(
        { header: game.liveAfter(first, 2), delayed: false, archived: false },
        plays.slice(0, first),
      );
      await driver.scoreboard({ status: "live", period: 2, clock: "17:40" });
      await page.locator('[data-slot="game-view"]').waitFor();
      await page.waitForTimeout(500);
      await watchShift(page);
      const seen: unknown[] = [{ scene: "before any penalty of the 2nd", ...(await box(page)) }];
      let at = first;
      for (const scene of scenes) {
        for (const play of scene.add) {
          driver.message({ type: "play-added", index: at++, play });
        }
        if (scene.clock) {
          await driver.scoreboard({ status: "live", period: 2, clock: scene.clock });
        }
        await page.waitForTimeout(3200);
        await penaltyShot(page, `${scene.name}-${width}-${scheme}`);
        seen.push({ scene: scene.name, ...(await box(page)) });
      }
      report[`penalties, stream ${scheme} ${width}`] = seen;
      report[`penalties, stream layout shift ${scheme} ${width}`] = await shiftSeen(page);
      if (errors.length > 0) report[`penalties, errors ${scheme} ${width}`] = errors;
      await page.close();
    }
  }

  // A Replay: the state at each play stepped to, forwards and backwards.
  const { page, errors } = await open("dark", 1440);
  await openReplay(page);
  const recordedPenalties = plays.filter((play) => play.penalty === true);
  const stepped: unknown[] = [{ step: "the whole game", ...(await box(page)) }];
  const steps = [
    ...recordedPenalties.map((play) => plays[plays.indexOf(play) + 2] as Located),
    powerPlayGoal,
    plays[plays.indexOf(recordedPenalties[0] as Located) - 1] as Located,
  ];
  for (const play of steps) {
    await stepTo(page, play);
    await page.waitForTimeout(900);
    stepped.push({ step: label(play), ...(await box(page)) });
  }
  await stepTo(page, plays[first + 1] as Located);
  await page.waitForTimeout(2200);
  await penaltyShot(page, "replay-1440-dark");
  report["penalties, replay"] = stepped;
  if (errors.length > 0) report["penalties, replay errors"] = errors;
  await page.close();

  // Reduced motion: the box and the ruled zone are there at once, with no fade.
  const reduced = await open("light", 390, true);
  await openReplay(reduced.page);
  await stepTo(reduced.page, plays[first + 1] as Located);
  await reduced.page.locator('[data-slot="boxed-penalty"]').waitFor();
  report["penalties, reduced motion"] = {
    ...(await box(reduced.page)),
    zoneOpacity: await reduced.page
      .locator('[data-slot="rink-power-play-zone"][data-on]')
      .evaluate((zone) => getComputedStyle(zone).opacity),
    rowAnimation: await reduced.page
      .locator('[data-slot="boxed-penalty"]')
      .first()
      .evaluate((row) => getComputedStyle(row).animationName),
  };
  await penaltyShot(reduced.page, "reduced-motion-390-light");
  await reduced.page.close();
}

if (!wants("shots")) {
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

// The end state of a save and a miss, in a Replay, in both themes at both widths. (A goal's is
// `goalSequence`'s.)
for (const scheme of ["light", "dark"] as const) {
  for (const width of [1440, 390]) {
    const { page, errors } = await open(scheme, width);
    await openReplay(page);
    for (const [name, play] of Object.entries({ save, miss })) {
      await stepTo(page, play);
      await page.waitForTimeout(2200);
      await rinkShot(page, `${name}-${width}-${scheme}`);
    }
    if (errors.length > 0) report[`errors ${scheme} ${width}`] = errors;
    await page.close();
  }
}

// A Replay stepped forwards and backwards: frames of the save in flight, and what is on the ice
// after each step. Then the same steps with no animations, to compare the layout shift.
for (const animated of [true, false]) {
  const { page, errors } = await open("dark", 1440);
  if (!animated) await withoutPlayer(page);
  await openReplay(page);
  await watchShift(page);
  const steps: unknown[] = [{ step: "opened, the whole game", ...(await ice(page)) }];
  await stepTo(page, save);
  for (const frame of [1, 2, 3, 4]) {
    await page.waitForTimeout(110);
    if (animated) await rinkShot(page, `save-in-flight-${frame}`);
    steps.push({ step: `save, frame ${frame}`, ...(await ice(page)) });
  }
  for (const [name, play] of [
    ["forwards to a miss", miss],
    ["forwards to a faceoff", faceoff],
    ["backwards to the save", save],
    ["backwards to the goal", goal],
  ] as const) {
    await stepTo(page, play);
    await page.waitForTimeout(2200);
    steps.push({ step: name, play: play.id, ...(await ice(page)) });
  }
  await page.getByRole("button", { name: "whole game" }).click();
  await page.waitForTimeout(300);
  steps.push({ step: "back to the whole game", ...(await ice(page)) });
  if (animated) {
    report.replay = steps;
    report["replay errors"] = errors;
  }
  report[`replay layout shift, ${animated ? "animated" : "no animations"}`] = await shiftSeen(page);
  await page.close();
}

// Reduced motion: the end state at once, with nothing in between.
{
  const { page } = await open("light", 1440, true);
  await openReplay(page);
  await stepTo(page, save);
  await page.locator('[data-slot="rink-fx"][data-kind="save"]').waitFor();
  const atOnce = await ice(page);
  await rinkShot(page, "save-reduced-motion");
  await page.waitForTimeout(1500);
  report["reduced motion"] = { atOnce, later: await ice(page) };
  await page.close();
}

// A Game Stream: one play arriving, then a burst, then a shot ESPN gave no place.
for (const animated of [true, false]) {
  const { page, errors } = await open("dark", 1440);
  if (!animated) await withoutPlayer(page);
  const driver = await driveGame(page, SCHEDULED_GAME);
  const state = (count: number) => ({
    header: game.liveAfter(count, 1),
    delayed: false,
    archived: false,
  });
  const start = plays.indexOf(save);
  await page.goto(`${baseURL}/nhl/games/${SCHEDULED_GAME}`, { waitUntil: "networkidle" });
  driver.agent(state(start), plays.slice(0, start));
  await driver.scoreboard({ status: "live", period: 1, clock: "12:34" });
  await page.locator('[data-slot="game-view"]').waitFor();
  await page.waitForTimeout(500);
  await watchShift(page);
  const stream: unknown[] = [{ step: "opened on a game in progress", ...(await ice(page)) }];

  // What is on the ice, sampled through everything that follows.
  await page.evaluate(() => {
    const seen: string[] = [];
    Object.assign(window, { seen });
    const sample = () => {
      const fx = document.querySelector('[data-slot="rink-fx"]');
      const trail = fx?.querySelector('[data-fx="trail"]');
      const shown = fx && getComputedStyle(fx).opacity === "1";
      const now = shown
        ? `${fx.getAttribute("data-kind")} from ${trail?.getAttribute("x1")}`
        : "clear";
      if (seen.at(-1) !== now) seen.push(now);
      requestAnimationFrame(sample);
    };
    sample();
  });
  const add = (from: number, count: number) => {
    for (let at = from; at < from + count; at++) {
      driver.message({ type: "play-added", index: at, play: plays[at] });
    }
    return from + count;
  };

  let next = add(start, 1);
  await page.waitForTimeout(400);
  if (animated) await rinkShot(page, "live-save-arriving");
  await page.waitForTimeout(2600);
  stream.push({ step: "one save arrived", play: save.id, ...(await ice(page)) });

  // A burst as one poll of ESPN delivers it: twelve plays in the same instant.
  const burst = plays.slice(next, next + 12);
  next = add(next, 12);
  await page.waitForTimeout(9000);
  stream.push({
    step: "a burst of twelve arrived",
    burst: burst.map(
      (play) => `${play.type}${play.coordinate ? ` from ${play.coordinate.x}` : ""}`,
    ),
    ...(await ice(page)),
  });

  driver.message({ type: "play-added", index: next, play: nowhere });
  await page.locator('[data-slot="play-row"][data-play="nowhere"]').waitFor();
  await page.waitForTimeout(600);
  stream.push({
    step: "a shot with no coordinate arrived",
    listed: await page.locator('[data-slot="play-row"][data-play="nowhere"]').count(),
    dots: await page.locator('[data-slot="rink-mark"][data-play="nowhere"]').count(),
    ...(await ice(page)),
  });
  stream.push({ seen: await page.evaluate(() => (window as unknown as { seen: string[] }).seen) });
  if (animated) {
    report.stream = stream;
    report["stream errors"] = errors;
  }
  report[`stream layout shift, ${animated ? "animated" : "no animations"}`] = await shiftSeen(page);
  await page.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
