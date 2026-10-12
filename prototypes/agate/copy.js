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
