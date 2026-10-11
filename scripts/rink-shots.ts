// The rink's animations in a real browser: screenshots for docs/design/rink-animations, and a
// report of what was on the ice at each step, which is how #141's acceptance was checked.
//
//   node scripts/rink-shots.ts [baseURL] [outDir]
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

const [baseURL = "http://localhost:5313", outDir = "docs/design/rink-animations"] =
  process.argv.slice(2);

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

const save = located((play) => play.type === "shot-on-goal", 40);
const miss = located((play) => play.type === "shot-missed", 40);
const goal = located((play) => play.scoring);
const faceoff = located((play) => play.type === "faceoff", 60);
const nowhere = { ...save, id: "nowhere", coordinate: null };

// Penalties and the power play (#143), in docs/design/penalties: a Game Stream given one penalty,
// the goal that ends it, two to one team and then one to the other; and a Replay stepped across
// the recorded game's penalties. `node scripts/rink-shots.ts <url> <outDir> penalties` stops here.
{
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

  if (process.argv[4] === "penalties") {
    await browser.close();
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  }
}

// The end state of each animation, in a Replay, in both themes at both widths.
for (const scheme of ["light", "dark"] as const) {
  for (const width of [1440, 390]) {
    const { page, errors } = await open(scheme, width);
    await openReplay(page);
    for (const [name, play] of Object.entries({ save, miss, goal })) {
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
