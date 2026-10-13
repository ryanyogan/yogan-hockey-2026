import type { Piece } from "@yogan-hockey/schemas";
import { rec } from "./agate-copy";
import { slateDate, slateDay } from "./game-time";

/*
 * What the site prints around a written piece (#217): the label over Home's section, the line
 * above a piece's headline, the lines Home shows of it, and the sentences that say a model wrote
 * it and how. They follow `prototypes/agate/copy.js`. The piece's own words are the model's.
 */

/** The label over Home's pieces. */
export const PIECES_LABEL = "Notes on the league";

/** What a kind is called above its headline. A kind with no word here is "The league". */
const KIND_WORDS: Record<string, string> = {
  preview: "Preview",
  recap: "Recap",
  league: "Standings",
  "picks-tonight": "Tonight's game",
  "picks-miss": "The miss",
  "picks-run": "The record",
};

/** Home's kinds in Home's order, which does not change through the day: tonight, last night, the table. */
export const HOME_KINDS = ["preview", "recap", "league"] as const;

/**
 * The Picks page's columns (#218) in its order: the game to watch tonight, the call that looked
 * foolish, and the record and its run. They are pieces like Home's, of kinds of their own.
 */
export const COLUMN_KINDS = ["picks-tonight", "picks-miss", "picks-run"] as const;

/** A piece leaves Home this long after it was written (`homePieces` says why 30). */
export const HOME_PIECE_HOURS = 30;
/** As many as the leads' grid has columns. */
export const MAX_HOME_PIECES = 3;

const kindWord = (kind: string): string => KIND_WORDS[kind] ?? "The league";

/** The red line over a piece on Home: what it is and the day it is about, "Preview · Mon Oct 12". */
export const pieceKicker = (piece: Pick<Piece, "kind" | "date">): string =>
  `${kindWord(piece.kind)} · ${slateDay(piece.date)}`;

/** The same on the piece's own page, with the day written out: "Preview · Monday, October 12". */
export const piecePageKicker = (piece: Pick<Piece, "kind" | "date">): string =>
  `${kindWord(piece.kind)} · ${slateDate(piece.date)}`;

/**
 * A piece's words as they are printed: a score or a record in them ("5-3", "2-0-0") never breaks
 * across lines, as no record on the site does (`rec`). Nothing else of the model's is touched.
 */
export const unbroken = (text: string): string => text.replace(/\d+(?:-\d+)+/g, rec);

/** A piece's paragraphs: its body is plain text with a blank line between them. */
export const pieceParagraphs = (body: string): string[] =>
  body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

/** The lines Home shows under a piece's headline: its first paragraph, which the page cuts short. */
export const pieceDeck = (body: string): string => pieceParagraphs(body)[0] ?? "";

/** A piece's address. */
export const pieceHref = (slug: string): string => `/pieces/${slug}`;

/** Before the time a piece was written, wherever a piece is shown. */
export const WRITTEN_BY = "Written by a model";

/** Under a piece on its own page, in small agate: who wrote it and what it was checked against. */
export const howWritten = (model: string): string =>
  `A model (${model}) wrote this from the standings, scores and picks this site holds, and no person edited it. Before it was published the site checked it against those figures: every team, player and score it names is among them, and every pick is the site's own.`;

/**
 * The pieces a page shows of the current ones (`getCurrentPieces`: the newest published of each
 * kind): those of the page's own kinds, written in the last 30 hours, three at most, in the
 * page's order.
 *
 * The Writer replaces each kind once a day, so a piece is a day old at most when all is well. The
 * six hours over that are the longest the night's recap waits for a late final. Past them the
 * Writer has missed a run and the piece is about a night that is over: a preview written at
 * 15:00 UTC is gone by 21:00 the next day (5 p.m. Eastern in summer), before that evening's
 * games though not before an afternoon's. Until then, and every morning until the Writer's
 * 15:00 run, the preview on Home is the day before's, which is why its kicker is its date and
 * never "tonight". A piece's own page stays, with its date on it.
 *
 * `now` null is no clock at all: fixture mode, where the recorded slate is one day's for ever.
 */
function shownPieces(pieces: readonly Piece[], now: Date | null, kinds: readonly string[]): Piece[] {
  const oldest = now == null ? Number.NEGATIVE_INFINITY : now.getTime() - HOME_PIECE_HOURS * 3600e3;
  return pieces
    .filter((piece) => kinds.includes(piece.kind) && Date.parse(piece.writtenAt) >= oldest)
    .map((piece, index) => ({ piece, index }))
    .sort(
      (a, b) => kinds.indexOf(a.piece.kind) - kinds.indexOf(b.piece.kind) || a.index - b.index,
    )
    .slice(0, MAX_HOME_PIECES)
    .map(({ piece }) => piece);
}

/** Home's pieces: the preview, the recap and the standings note, and no column of the Picks page. */
export const homePieces = (pieces: readonly Piece[], now: Date | null): Piece[] =>
  shownPieces(pieces, now, HOME_KINDS);

/** The Picks page's columns, by the same rule as Home's pieces. */
export const columnPieces = (pieces: readonly Piece[], now: Date | null): Piece[] =>
  shownPieces(pieces, now, COLUMN_KINDS);
