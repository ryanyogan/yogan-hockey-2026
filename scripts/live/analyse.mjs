/**
 * Reads what the recorders in this directory wrote and prints the numbers the live game
 * verification (#54) asks for, as JSON.
 *
 *   node scripts/live/analyse.mjs <outDir> <gameId> [section...]
 *
 * Sections: delay, revisions, status, freshness, goals, standings, site, duration. All by default.
 */
import { createReadStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";

const [outDir, gameId, ...sections] = process.argv.slice(2);
if (!outDir || !gameId) {
  console.error("usage: analyse.mjs <outDir> <gameId> [section...]");
  process.exit(1);
}
const wants = (name) => sections.length === 0 || sections.includes(name);

async function* lines(name) {
  const path = `${outDir}/${name}`;
  if (!existsSync(path)) return;
  for await (const line of createInterface({ input: createReadStream(path) })) {
    if (!line) continue;
    try {
      yield JSON.parse(line);
    } catch {}
  }
}
const ms = (iso) => Date.parse(iso);
const quantiles = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q) =>
    sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] : null;
  return {
    n: sorted.length,
    min: sorted[0] ?? null,
    p10: at(0.1),
    p25: at(0.25),
    median: at(0.5),
    p75: at(0.75),
    p90: at(0.9),
    max: sorted.at(-1) ?? null,
  };
};
/** Every path at which two JSON values differ, as `a.b.0.c`. */
function differences(before, after, path = "") {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  const both = (value) => value !== null && typeof value === "object";
  if (!both(before) || !both(after)) return [path || "."];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].flatMap((key) =>
    differences(before[key], after[key], path ? `${path}.${key}` : key),
  );
}
/**
 * A period and a clock as seconds played since the opening faceoff. A status's clock counts down
 * to the end of the period; a play's clock counts up from its start.
 */
function played(period, clock, countsUp = false) {
  const match = /^(\d+):(\d+)/.exec(clock ?? "");
  if (!period || !match) return null;
  const shown = Number(match[1]) * 60 + Number(match[2]);
  const length = period <= 3 ? 1200 : 300;
  return (
    (Math.min(period, 4) - 1) * 1200 + (period > 4 ? 300 : 0) + (countsUp ? shown : length - shown)
  );
}

// One pass over ESPN's lines.
const summaries = [];
const boards = [];
const standings = [];
const versions = new Map();
const removed = [];
let liveSince = null;
let finalSince = null;
for await (const line of lines("espn.jsonl")) {
  if (line.kind === "summary" && line.id === gameId && line.header) {
    summaries.push(line);
    if (line.header.state === "in") liveSince ??= ms(line.t);
    if (line.header.completed) finalSince ??= ms(line.t);
  } else if (line.kind === "play" && line.id === gameId) {
    if (!versions.has(line.playId)) versions.set(line.playId, []);
    versions
      .get(line.playId)
      .push({ t: ms(line.t), index: line.index, change: line.change, play: line.play });
  } else if (line.kind === "play-removed" && line.id === gameId) {
    removed.push({ t: line.t, playId: line.playId, was: versions.get(line.playId)?.at(-1)?.play });
  } else if (line.kind === "scoreboard" && line.events) {
    const event = line.events.find((item) => item.id === gameId);
    if (event) boards.push({ t: ms(line.t), http: line.http, ...event });
  } else if (line.kind === "standings") {
    standings.push(line);
  }
}
const out = {
  gameId,
  liveSince: liveSince && new Date(liveSince).toISOString(),
  finalSince: finalSince && new Date(finalSince).toISOString(),
  summaryPolls: summaries.length,
  scoreboardPolls: boards.length,
};

if (wants("delay")) {
  // A play first seen on a poll after the first one of the live game: the poll before it did not
  // have it, so it was posted in the 10 seconds between. First seen minus `wallclock` is then
  // ESPN's delay plus up to one polling interval.
  const firstPoll = summaries.find((line) => line.header.state === "in" && line.count > 0);
  const lags = [];
  const byType = new Map();
  const noWallclock = [];
  for (const [id, list] of versions) {
    const first = list[0];
    if (!firstPoll || first.t <= ms(firstPoll.t)) continue;
    if (!first.play.wallclock) {
      noWallclock.push(first.play.type?.text);
      continue;
    }
    const lag = (first.t - ms(first.play.wallclock)) / 1000;
    lags.push({
      id,
      lag,
      type: first.play.type?.text,
      period: first.play.period?.number,
      clock: first.play.clock?.displayValue,
    });
    if (!byType.has(first.play.type?.text)) byType.set(first.play.type?.text, []);
    byType.get(first.play.type?.text).push(lag);
  }
  const sample = [...versions.values()][0]?.[0]?.play;
  out.delay = {
    wallclockExample: sample?.wallclock,
    all: quantiles(lags.map((item) => item.lag)),
    sane: quantiles(lags.map((item) => item.lag).filter((lag) => lag >= 0 && lag < 600)),
    negative: lags.filter((item) => item.lag < 0).length,
    over10Minutes: lags.filter((item) => item.lag >= 600),
    byType: Object.fromEntries([...byType].map(([type, list]) => [type, quantiles(list)])),
    noWallclock: noWallclock.length,
    playsPerPollThatHadAny: quantiles(
      Object.values(Object.groupBy(lags, (item) => String(versions.get(item.id)[0].t))).map(
        (list) => list.length,
      ),
    ),
  };
}

if (wants("revisions")) {
  const changes = [];
  const paths = new Map();
  for (const [id, list] of versions) {
    for (let index = 1; index < list.length; index++) {
      const diff = differences(list[index - 1].play, list[index].play);
      const key = diff
        .map((path) => path.replace(/\.\d+(\.|$)/g, ".N$1"))
        .sort()
        .join(" + ");
      paths.set(key, (paths.get(key) ?? 0) + 1);
      changes.push({
        id,
        t: list[index].t,
        afterFirstSeen: (list[index].t - list[0].t) / 1000,
        diff,
        type: list[index].play.type?.text,
        before: list[index - 1].play,
        after: list[index].play,
      });
    }
  }
  // Order: a poll's list, without the plays the poll before did not have, against that poll's list
  // without the plays this one dropped. Anything else is a reorder.
  let reorders = 0;
  const insertedInside = [];
  let previous = null;
  for (const line of summaries) {
    if (!line.order) continue;
    const ids = line.order.map((item) => item.split(":")[0]);
    if (previous) {
      const before = new Set(previous);
      const now = new Set(ids);
      const kept = ids.filter((id) => before.has(id));
      const was = previous.filter((id) => now.has(id));
      if (kept.join() !== was.join()) reorders++;
      const lastOld = Math.max(...ids.map((id, index) => (before.has(id) ? index : -1)));
      ids.forEach((id, index) => {
        if (!before.has(id) && index < lastOld)
          insertedInside.push({ t: line.t, id, index, of: ids.length });
      });
    }
    previous = ids;
  }
  const during = (list) => list.filter((item) => !finalSince || item.t <= finalSince).length;
  out.revisions = {
    plays: versions.size,
    playsRevised: new Set(changes.map((item) => item.id)).size,
    revisions: changes.length,
    revisionsWhileLive: during(changes),
    secondsFromFirstSeenToRevision: quantiles(changes.map((item) => item.afterFirstSeen)),
    whatChanged: Object.fromEntries([...paths].sort((a, b) => b[1] - a[1])),
    removed: removed.map((item) => ({
      t: item.t,
      id: item.playId,
      type: item.was?.type?.text,
      text: item.was?.text,
      period: item.was?.period?.number,
      clock: item.was?.clock?.displayValue,
    })),
    reorders,
    insertedInside: insertedInside.length,
    insertedInsideExamples: insertedInside.slice(0, 5),
    sequenceNumberAscends: summaries.length > 0,
    examples: changes
      .filter((item) => !/^modified$/.test(item.diff.join()))
      .slice(0, 12)
      .map((item) => ({
        id: item.id,
        type: item.type,
        afterFirstSeen: item.afterFirstSeen,
        changed: Object.fromEntries(
          item.diff.slice(0, 6).map((path) => {
            const read = (value) => path.split(".").reduce((node, key) => node?.[key], value);
            return [path, [read(item.before), read(item.after)]];
          }),
        ),
      })),
  };
}

if (wants("status")) {
  const runs = (list, key) => {
    const result = [];
    for (const item of list) {
      const value = key(item);
      if (result.at(-1)?.value !== value)
        result.push({ from: new Date(item.t).toISOString?.() ?? item.t, value, polls: 0 });
      result.at(-1).polls++;
    }
    return result;
  };
  const noClock = (status) =>
    JSON.stringify({
      name: status.name,
      state: status.state,
      completed: status.completed,
      description: status.description,
      period: status.period,
    });
  out.status = {
    summary: runs(
      summaries.map((line) => ({ ...line, t: ms(line.t) })),
      (line) => noClock(line.header),
    ),
    scoreboard: runs(boards, noClock),
    summaryDetails: [
      ...new Set(
        summaries
          .map((line) => `${line.header.detail} | ${line.header.shortDetail}`)
          .map((text) => text.replace(/\d+:\d+/g, "M:SS")),
      ),
    ],
    summaryStatusKeys: [...new Set(summaries.flatMap((line) => Object.keys(line.rawStatus ?? {})))],
    summaryHasClock: summaries.filter(
      (line) => line.header.state === "in" && line.header.displayClock != null,
    ).length,
    summaryLivePolls: summaries.filter((line) => line.header.state === "in").length,
    // What the header says while the last play is the end of a period.
    whileLastPlayIsPeriodEnd: [
      ...new Set(
        summaries
          .filter((line) => /end.*period|period.*end/i.test(line.last?.type ?? ""))
          .map(
            (line) =>
              `${line.header.name} ${line.header.description} clock=${line.header.displayClock} period=${line.header.period} last=${line.last.type}`,
          ),
      ),
    ],
    intermissionWithoutPeriodEnd: summaries.filter(
      (line) =>
        /intermission|end of/i.test(`${line.header.name} ${line.header.description}`) &&
        !/end.*period|period.*end/i.test(line.last?.type ?? ""),
    ).length,
    intermissionPolls: summaries.filter((line) =>
      /intermission|end of/i.test(`${line.header.name} ${line.header.description}`),
    ).length,
  };
}

if (wants("freshness")) {
  // Score: when each source first shows each total. Clock: at each scoreboard poll, the summary
  // poll nearest in time, and which has played further.
  const total = (score) => (score ?? []).reduce((sum, side) => sum + Number(side[2] ?? 0), 0);
  const firsts = (list, when) => {
    const seen = new Map();
    for (const item of list) {
      const key = (item.score ?? []).map((side) => `${side[1]} ${side[2]}`).join(", ");
      if (!seen.has(key)) seen.set(key, when(item));
    }
    return seen;
  };
  const summaryScores = firsts(
    summaries.filter((line) => line.header.state !== "pre"),
    (line) => ms(line.t),
  );
  const boardScores = firsts(
    boards.filter((line) => line.state !== "pre"),
    (line) => line.t,
  );
  const goalSeen = new Map();
  for (const list of versions.values()) {
    const first = list[0];
    if (first.play.scoringPlay)
      goalSeen.set(`${first.play.awayScore}-${first.play.homeScore}`, {
        t: first.t,
        wallclock: first.play.wallclock,
      });
  }
  out.freshness = {
    score: [...summaryScores].map(([score, at]) => ({
      score,
      summaryHeader: new Date(at).toISOString(),
      scoreboardMinusSummarySeconds: boardScores.has(score)
        ? (boardScores.get(score) - at) / 1000
        : null,
    })),
    goalPlays: Object.fromEntries(
      [...goalSeen].map(([score, seen]) => [
        score,
        { playFirstSeen: new Date(seen.t).toISOString(), wallclock: seen.wallclock },
      ]),
    ),
  };
  const gaps = [];
  let cursor = 0;
  for (const board of boards) {
    if (board.state !== "in") continue;
    while (
      cursor + 1 < summaries.length &&
      Math.abs(ms(summaries[cursor + 1].t) - board.t) <= Math.abs(ms(summaries[cursor].t) - board.t)
    )
      cursor++;
    const summary = summaries[cursor];
    if (!summary || Math.abs(ms(summary.t) - board.t) > 3000 || summary.header.state !== "in")
      continue;
    const boardPlayed = played(board.period, board.displayClock);
    const headerPlayed = played(summary.header.period, summary.header.displayClock);
    const lastPlayPlayed = played(summary.last?.period, summary.last?.clock, true);
    gaps.push({
      t: board.t,
      boardPlayed,
      headerPlayed,
      lastPlayPlayed,
      total: total(summary.score),
    });
  }
  const both = gaps.filter((gap) => gap.boardPlayed !== null && gap.headerPlayed !== null);
  out.freshness.clock = {
    pairs: gaps.length,
    summaryHeaderHasClock: both.length,
    // Positive: the scoreboard's clock has run further than the summary's.
    scoreboardAheadOfSummaryHeaderSeconds: quantiles(
      both.map((gap) => gap.boardPlayed - gap.headerPlayed),
    ),
    equal: both.filter((gap) => gap.boardPlayed === gap.headerPlayed).length,
    scoreboardAheadOfLastPlaySeconds: quantiles(
      gaps
        .filter((gap) => gap.boardPlayed !== null && gap.lastPlayPlayed !== null)
        .map((gap) => gap.boardPlayed - gap.lastPlayPlayed),
    ),
    summaryHeaderAheadOfLastPlaySeconds: quantiles(
      both
        .filter((gap) => gap.lastPlayPlayed !== null)
        .map((gap) => gap.headerPlayed - gap.lastPlayPlayed),
    ),
  };
  // How often each clock moves: a clock that is the same on consecutive polls while play runs.
  const moves = (list, key) => {
    let changed = 0;
    for (let index = 1; index < list.length; index++)
      if (key(list[index]) !== key(list[index - 1])) changed++;
    return { polls: list.length, changed };
  };
  out.freshness.clockMoves = {
    scoreboard: moves(
      boards.filter((line) => line.state === "in"),
      (line) => `${line.period} ${line.displayClock}`,
    ),
    summaryHeader: moves(
      summaries.filter((line) => line.header.state === "in"),
      (line) => `${line.header.period} ${line.header.displayClock}`,
    ),
  };
  out.freshness.cacheControl = {
    summary: [...new Set(summaries.map((line) => line.http?.cache))],
    scoreboard: [...new Set(boards.map((line) => line.http?.cache))],
  };
}

if (wants("goals")) {
  const goals = [];
  for (const [id, list] of versions) {
    if (
      !list.some(
        (version) => version.play.scoringPlay || /goal/i.test(version.play.type?.text ?? ""),
      )
    )
      continue;
    goals.push({
      id,
      firstSeen: new Date(list[0].t).toISOString(),
      versions: list.length,
      types: [...new Set(list.map((version) => version.play.type?.text))],
      scoringPlay: [...new Set(list.map((version) => version.play.scoringPlay))],
      texts: [...new Set(list.map((version) => version.play.text))],
      removed: removed.some((item) => item.playId === id),
    });
  }
  const totals = summaries.map((line) => ({
    t: line.t,
    total: (line.score ?? []).reduce((sum, side) => sum + Number(side[2] ?? 0), 0),
  }));
  const drops = totals.filter((item, index) => index > 0 && item.total < totals[index - 1].total);
  const reviews = [...versions.values()]
    .flatMap((list) => list)
    .filter((version) =>
      /challenge|review|overturn|disallow|no goal/i.test(
        `${version.play.type?.text} ${version.play.text}`,
      ),
    );
  out.goals = {
    goals,
    scoreWentDown: drops,
    typesSeen: Object.fromEntries(
      Object.entries(
        Object.groupBy(
          [...versions.values()].map((list) => list.at(-1).play.type?.text),
          (type) => type,
        ),
      ).map(([type, list]) => [type, list.length]),
    ),
    reviewLike: reviews.map((version) => ({
      t: new Date(version.t).toISOString(),
      type: version.play.type?.text,
      text: version.play.text,
      period: version.play.period?.number,
      clock: version.play.clock?.displayValue,
    })),
  };
}

if (wants("standings")) {
  const boardFinal = boards.find((line) => line.completed);
  const teams = (boards[0]?.score ?? []).map((side) => side[1]);
  const record = (line) => (line.score ?? []).map((side) => `${side[1]} ${side[3]}`).join(", ");
  const recordBefore = boards[0] && record(boards[0]);
  const recordChanged = boards.find((line) => record(line) !== recordBefore);
  let before = null;
  let rowsNow = null;
  let standingsChanged = null;
  for (const line of standings) {
    if (line.rows)
      rowsNow = Object.fromEntries(line.rows.map((row) => [row[0], row.slice(1).join("-")]));
    if (!rowsNow) continue;
    const mine = teams.map((team) => `${team} ${rowsNow[team]}`).join(", ");
    before ??= mine;
    if (mine !== before && !standingsChanged)
      standingsChanged = { t: line.t, from: before, to: mine };
  }
  const after = (iso) => (iso && finalSince ? (ms(iso) - finalSince) / 1000 : null);
  out.standings = {
    teams,
    summaryFinal: out.finalSince,
    scoreboardFinal: boardFinal && new Date(boardFinal.t).toISOString(),
    scoreboardFinalAfterSummarySeconds: boardFinal ? (boardFinal.t - finalSince) / 1000 : null,
    scoreboardRecords: recordChanged
      ? {
          t: new Date(recordChanged.t).toISOString(),
          from: recordBefore,
          to: record(recordChanged),
          secondsAfterFinal: (recordChanged.t - finalSince) / 1000,
        }
      : null,
    standings: standingsChanged
      ? { ...standingsChanged, secondsAfterFinal: after(standingsChanged.t) }
      : null,
    standingsPollsAfterFinal: standings.filter((line) => finalSince && ms(line.t) > finalSince)
      .length,
  };
  const pages = [];
  let last = "";
  for await (const line of lines("pages.jsonl")) {
    if (line.path !== "/nhl" || !line.rows) continue;
    const key = line.rows.join(" | ");
    if (key !== last)
      pages.push({ t: line.t, rows: key, cache: line.cache, secondsAfterFinal: after(line.t) });
    last = key;
  }
  out.standings.sitePage = pages;
}

if (wants("site") || wants("duration")) {
  const pushed = new Map();
  const states = [];
  const sockets = [];
  for await (const line of lines("sockets.jsonl")) {
    if (line.socket !== gameId) continue;
    if (line.kind !== "frame") {
      sockets.push({ t: line.t, kind: line.kind, code: line.code });
      continue;
    }
    const data = line.data;
    if (data?.type === "play-added" && !pushed.has(data.play.id))
      pushed.set(data.play.id, ms(line.t));
    if (data?.type === "plays")
      for (const play of data.plays) if (!pushed.has(play.id)) pushed.set(play.id, ms(line.t));
    if (data?.type === "cf_agent_state") {
      const header = data.state?.header;
      states.push({
        t: line.t,
        status: header?.status,
        period: header?.period,
        clock: header?.clock,
        detail: header?.detail,
        score: `${header?.away?.score}-${header?.home?.score}`,
        delayed: data.state?.delayed,
        archived: data.state?.archived,
      });
    }
  }
  if (wants("site")) {
    const behind = [];
    const total = [];
    for (const [id, list] of versions) {
      if (!pushed.has(id) || (liveSince && list[0].t < liveSince + 60_000)) continue;
      behind.push((pushed.get(id) - list[0].t) / 1000);
      if (list[0].play.wallclock) total.push((pushed.get(id) - ms(list[0].play.wallclock)) / 1000);
    }
    const stateRuns = [];
    for (const state of states) {
      const key = `${state.status} p${state.period} ${state.detail?.replace(/\d+:\d+/g, "M:SS")} delayed=${state.delayed} archived=${state.archived}`;
      if (stateRuns.at(-1)?.key !== key) stateRuns.push({ from: state.t, key, frames: 0 });
      stateRuns.at(-1).frames++;
    }
    out.site = {
      sockets,
      playsPushed: pushed.size,
      playsEspnHad: versions.size,
      neverPushed: [...versions.keys()].filter(
        (id) => !pushed.has(id) && !removed.some((item) => item.playId === id),
      ).length,
      // Negative when the Agent's poll happened to fall before the recorder's.
      pushAfterRecorderFirstSawItSeconds: quantiles(behind),
      pushAfterWallclockSeconds: quantiles(total.filter((lag) => lag > -60 && lag < 600)),
      stateFrames: states.length,
      clocksSent: [...new Set(states.map((state) => state.clock))].length,
      states: stateRuns,
    };
  }
}

if (wants("duration")) {
  // The Worker's own events: every alarm, socket event and RPC of each Durable Object with its
  // wall time. The game's object is the one that answered `/agents/game-agent/<gameId>`.
  const events = [];
  for await (const line of lines("worker.jsonl")) if (line.kind === "event") events.push(line);
  const mine = new Set(
    events
      .filter(
        (event) =>
          event.durableObject && String(event.message).includes(`/agents/game-agent/${gameId}`),
      )
      .map((event) => event.durableObject),
  );
  const board = new Set(
    events
      .filter(
        (event) =>
          event.durableObject && String(event.message).includes("/agents/scoreboard-agent/"),
      )
      .map((event) => event.durableObject),
  );
  const sum = (ids, from, to) => {
    const list = events.filter(
      (event) =>
        ids.has(event.durableObject) &&
        (!from || ms(event.t) >= from) &&
        (!to || ms(event.t) <= to),
    );
    const byType = {};
    for (const event of list) {
      byType[event.type] ??= { events: 0, wallSeconds: 0, cpuMs: 0 };
      byType[event.type].events++;
      byType[event.type].wallSeconds += (event.wall ?? 0) / 1000;
      byType[event.type].cpuMs += event.cpu ?? 0;
    }
    const wallSeconds = list.reduce((total, event) => total + (event.wall ?? 0) / 1000, 0);
    // Events of one object overlap (an RPC during an alarm), so the union of their spans is the
    // time the object was at work; the sum counts the overlap twice.
    const spans = list
      .map((event) => [ms(event.t) - (event.wall ?? 0), ms(event.t)])
      .sort((a, b) => a[0] - b[0]);
    let union = 0;
    let end = 0;
    for (const [start, stop] of spans) {
      if (stop <= end) continue;
      union += stop - Math.max(start, end);
      end = stop;
    }
    return {
      events: list.length,
      wallSeconds: Math.round(wallSeconds),
      unionSecondsIfTimestampIsTheEnd: Math.round(union / 1000),
      gbSeconds: Math.round((wallSeconds * 128) / 1024),
      byType,
      alarmWall: quantiles(
        list.filter((event) => event.type === "alarm").map((event) => event.wall),
      ),
    };
  };
  const samples = [];
  for await (const line of lines("worker.jsonl"))
    if (line.kind === "sample" || line.kind === "sample-failed" || line.kind === "build")
      samples.push(line);
  out.duration = {
    gameObjects: [...mine],
    scoreboardObjects: [...board],
    logSamples: samples.filter((line) => line.kind === "sample").length,
    samplesThatHitTheLimit: samples.filter((line) => line.returned >= 2000).length,
    failedSamples: samples.filter((line) => line.kind === "sample-failed").length,
    builds: samples.filter((line) => line.kind === "build"),
    gameWhileLive: sum(mine, liveSince, finalSince ? finalSince + 60_000 : null),
    gameAllRecorded: sum(mine),
    scoreboardWhileLive: sum(board, liveSince, finalSince ? finalSince + 60_000 : null),
    liveSeconds: liveSince && finalSince ? (finalSince - liveSince) / 1000 : null,
  };
}

console.log(JSON.stringify(out, null, 1));
