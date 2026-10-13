// PROTOTYPE (Agate). Every sentence the design prints, as pure functions of the game.
// These are the rules to port (to apps/web/lib, with Vitest tests); the prototype only renders
// what they return. Nothing here invents a fact: each word comes from the score, the status,
// the records or the pick.

import { TEAMS } from "./data.js";

/** The name in agate type: the location, or "N.Y. Rangers" where two clubs share one. */
export const agateName = (abbr) => TEAMS[abbr].agate ?? TEAMS[abbr].location;
/** The nickname a headline uses: "Kraken", "Maple Leafs". */
export const nickname = (abbr) => TEAMS[abbr].shortName;

const ORDINAL_PERIOD = {
  "1st": "the 1st",
  "2nd": "the 2nd",
  "3rd": "the 3rd",
  OT: "overtime",
  SO: "the shootout",
};
/** "3rd 18:44" → "the 3rd"; "OT 2:10" → "overtime". */
export const periodPhrase = (detail) => ORDINAL_PERIOD[detail.split(" ")[0]] ?? "progress";

/** A record that never breaks across lines: word joiners around its hyphens. */
export const rec = (record) => record.replaceAll("-", "⁠-⁠");

export const winner = (g) => (g.away.score > g.home.score ? g.away : g.home);
export const loser = (g) => (g.away.score > g.home.score ? g.home : g.away);

/** Right or wrong once a picked game is final; null before then, or with no pick. */
export function pickOutcome(g) {
  if (g.status !== "final" || g.pick == null) return null;
  return winner(g).abbr === g.pick.team ? "right" : "wrong";
}

/**
 * The headline.
 *   final      winner first, nicknames:  "Kraken 5, Capitals 3"
 *   live       away then home, as the line score reads: "Mammoth 2, Devils 2"
 *   scheduled  "Golden Knights at Kraken"
 *   postponed  same as scheduled
 */
export function headline(g) {
  if (g.status === "final") {
    const w = winner(g);
    const l = loser(g);
    return `${nickname(w.abbr)} ${w.score}, ${nickname(l.abbr)} ${l.score}`;
  }
  if (g.status === "live") {
    return `${nickname(g.away.abbr)} ${g.away.score}, ${nickname(g.home.abbr)} ${g.home.score}`;
  }
  return `${nickname(g.away.abbr)} at ${nickname(g.home.abbr)}`;
}

/**
 * The deck: one or two plain sentences under the headline.
 *   final      "The Kraken win on the road and move to 4-2-0. The Capitals fall to 3-2-0."
 *              + " in overtime" / " in a shootout" from the detail.
 *   live       "The Rangers lead by 1 in the 3rd." / "Tied in overtime."
 *   scheduled  "The Golden Knights (2-1-0) visit the Kraken (2-1-0)."
 * Nicknames take a plural verb ("the Wild win", "the Lightning fall"), so one form fits all 32.
 *   postponed  "Postponed."
 * The Oct 11 artboards carry hand-written decks ("first in the East", "still looking for its
 * first win"); those are the tone to aim for, but only facts derivable from data ship.
 */
export function deck(g) {
  if (g.status === "final") {
    const w = winner(g);
    const l = loser(g);
    const where = w === g.home ? "at home" : "on the road";
    const extra = /OT/.test(g.detail)
      ? " in overtime"
      : /SO/.test(g.detail)
        ? " in a shootout"
        : "";
    return `The ${nickname(w.abbr)} win ${where}${extra} and move to ${rec(w.record)}. The ${nickname(l.abbr)} fall to ${rec(l.record)}.`;
  }
  if (g.status === "live") {
    const diff = g.away.score - g.home.score;
    const when = periodPhrase(g.detail);
    if (diff === 0)
      return when === "overtime"
        ? "Tied in overtime."
        : `Tied ${g.away.score}–${g.home.score} in ${when}.`;
    const lead = diff > 0 ? g.away : g.home;
    return `The ${nickname(lead.abbr)} lead by ${Math.abs(diff)} in ${when}.`;
  }
  if (g.status === "postponed") return "Postponed.";
  return `The ${nickname(g.away.abbr)} (${rec(g.away.record)}) visit the ${nickname(g.home.abbr)} (${rec(g.home.record)}).`;
}

/** The red line above the headline: status · venue. */
export function kicker(g) {
  const status =
    g.status === "scheduled"
      ? g.start
      : g.status === "postponed"
        ? "Postponed"
        : g.status === "live"
          ? `Live · ${g.detail}`
          : g.detail;
  return g.venue ? `${status} · ${g.venue}` : status;
}

/** "Our pick: Washington, 63%." — the site's word is "pick" (GLOSSARY.md), never odds. */
export const pickSentence = (g) =>
  g.pick ? `Our pick: ${agateName(g.pick.team)}, ${g.pick.pct}%.` : null;

/**
 * Leads and briefs. Up to three games are drawn as full stories ("leads"); every other game is
 * a one-line brief in the agate "Around the league" table. Leads are chosen by what matters
 * right now — live games, then the next to start, then the latest finals — and each list keeps
 * the slate's own stable order (docs/design/stable-game-order) so nothing reshuffles while a
 * game is being watched; a game only moves when its status changes.
 */
export function leadsAndBriefs(games, max = 3) {
  const rank = { live: 0, scheduled: 1, final: 2, postponed: 3 };
  const chosen = [...games.keys()]
    .sort(
      (a, b) =>
        rank[games[a].status] - rank[games[b].status] ||
        (games[a].status === "final" ? b - a : a - b),
    )
    .slice(0, max);
  const lead = new Set(chosen);
  return {
    leads: games.filter((_, i) => lead.has(i)),
    briefs: games.filter((_, i) => !lead.has(i)),
  };
}

/** The game in a brief: "Montreal 3, Carolina 2", "Utah 2, New Jersey 2", "Vegas at Seattle". */
export function briefGame(g) {
  if (g.status === "final") {
    const w = winner(g);
    const l = loser(g);
    return `${agateName(w.abbr)} ${w.score}, ${agateName(l.abbr)} ${l.score}`;
  }
  if (g.status === "live")
    return `${agateName(g.away.abbr)} ${g.away.score}, ${agateName(g.home.abbr)} ${g.home.score}`;
  return `${agateName(g.away.abbr)} at ${agateName(g.home.abbr)}`;
}

export function counts(games) {
  const by = (s) => games.filter((g) => g.status === s).length;
  return { total: games.length, live: by("live"), toCome: by("scheduled"), final: by("final") };
}

/** "Two of three tonight": picked finals only. */
export function tonightPicks(games) {
  const outcomes = games.map(pickOutcome).filter(Boolean);
  return { right: outcomes.filter((o) => o === "right").length, decided: outcomes.length };
}

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
export const spelled = (n, capital = true) => {
  const w = WORDS[n] ?? String(n);
  return capital ? w : w.toLowerCase();
};

/* ---------- the written pieces (#217) ---------- */

/** The label over Home's pieces. */
export const PIECES_LABEL = "Notes on the league";

/** What a kind is called above its headline. A kind with no word here is "The league". */
const KIND_WORDS = {
  preview: "Preview",
  recap: "Recap",
  league: "Standings",
  "picks-tonight": "Tonight's game",
  "picks-miss": "The miss",
  "picks-run": "The record",
};
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** A day (`YYYY-MM-DD`) in agate: "Mon Oct 12". */
export function slateDay(date) {
  const day = new Date(`${date}T00:00:00Z`);
  return `${DAYS[day.getUTCDay()]} ${MONTHS[day.getUTCMonth()]} ${day.getUTCDate()}`;
}

/** The red line over a piece: what it is and the day it is about, "Preview · Mon Oct 12". */
export const pieceKicker = (piece) =>
  `${KIND_WORDS[piece.kind] ?? "The league"} · ${slateDay(piece.date)}`;

/**
 * The Picks page's columns (#218) in its order: the game to watch tonight, the call that looked
 * foolish, and the record and its run. They are pieces like Home's, of kinds of their own.
 */
export const COLUMN_KINDS = ["picks-tonight", "picks-miss", "picks-run"];

/** A piece's words as printed: a score or a record in them never breaks across lines. */
export const unbroken = (text) => text.replace(/\d+(?:-\d+)+/g, rec);

/** Before the time a piece was written, wherever a piece is shown. */
export const WRITTEN_BY = "Written by a model";

/** Under a piece on its own page, in small agate: who wrote it and what it was checked against. */
export const howWritten = (model) =>
  `A model (${model}) wrote this from the standings, scores and picks this site holds, and no person edited it. Before it was published the site checked it against those figures: every team, player and score it names is among them, and every pick is the site's own.`;

/* ---------- the Picks page (#218) ---------- */

/*
 * Every sentence and label the Picks page prints around its figures. The site's port is
 * `apps/web/lib/picks-page-copy.ts`, function for function. A tally is `{ right, wrong }`.
 */

export const PICKS_TITLE = "Picks";

/** Under the title: what a pick is, who makes it and how it is marked. */
export const PICKS_LEDE =
  "A model picks a winner for every game before it starts, for fun. Each pick is marked right or wrong against the final score, and none is ever changed.";

export const TONIGHT_LABEL = "Tonight's picks";
export const COLUMNS_LABEL = "From the picks desk";

/** The label over the week's figures: this week, or the last one that had a result. */
export const weekLabel = (week) =>
  week.current ? "This week in figures" : "The latest week in figures";

/** The week's days beside its label: "Mon Oct 5 to Sun Oct 11". */
export const weekSpan = (week) => `${slateDay(week.start)} to ${slateDay(week.end)}`;

/** Two figures either side of an en dash that never part across lines: word joiners round it. */
const dashed = (first, second) => `${first}\u2060–\u2060${second}`;

/** A record as the site prints one: right, an en dash, wrong. "29–14". */
export const record = ({ right, wrong }) => dashed(right, wrong);

/** How often a tally was right, "67%", or nothing for a tally of no picks. */
export function share({ right, wrong }) {
  const picks = right + wrong;
  return picks === 0 ? "" : `${Math.round((right / picks) * 100)}%`;
}

/** The run as a big figure and the words under it: 3, "right in a row". */
export const runWords = (run) => ({ figure: String(run.length), key: `${run.outcome} in a row` });

/** A band of chances as a row's name: "50–54%", "65% and up". */
export const bandLabel = ({ from, to }) => (to == null ? `${from}% and up` : `${from}–${to}%`);

export const SIDE_LABELS = { home: "Home team picked", road: "Road team picked" };

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const weekday = (date) => WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];

/**
 * A call in one sentence, the winner's score first: "The Carolina Hurricanes, picked at 78% on
 * the road, beat the Philadelphia Flyers 4–1 on Monday." The names are whole.
 */
export function callSentence(call) {
  const { picked, opponent } = call.score;
  const where = call.pickedHome ? "at home" : "on the road";
  const how =
    picked > opponent
      ? `beat the ${call.opponent.name} ${dashed(picked, opponent)}`
      : `lost ${dashed(opponent, picked)} to the ${call.opponent.name}`;
  return `The ${call.picked.name}, picked at ${Math.round(call.winProbability)}% ${where}, ${how} on ${weekday(call.date)}.`;
}

export const BEST_CALL = "Best call";
export const WORST_CALL = "Worst call";

/** In place of the figures before any pick is decided. */
export function noFigures(awaiting) {
  const first = "No pick has been decided yet this season. The figures start with the first final.";
  if (awaiting === 0) return first;
  return `${first} ${awaiting === 1 ? "One pick is" : `${awaiting} picks are`} waiting on ${awaiting === 1 ? "its game" : "their games"}.`;
}
