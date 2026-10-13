import type { Piece } from "@yogan-hockey/schemas";
import {
  PIECES_LABEL,
  pieceDeck,
  pieceHref,
  pieceKicker,
  unbroken,
  WRITTEN_BY,
} from "../../lib/piece-copy";
import { Link } from "../link";
import { LocalTime } from "../local-time";
import { storyOnTv, storyRule } from "../story/type";
import { column, columns, flag, link, sectionHead, sectionTitle } from "./front";

/**
 * Written pieces side by side: each with a red line saying what it is and the day it is about, a
 * serif headline that links to its page, its first paragraph cut at five lines, and in agate that
 * a model wrote it and when. The headline is smaller than a lead's: a piece's is a sentence of up
 * to ninety letters, where a lead's is two clubs and a score.
 *
 * `look` says whose page this is. The Picks page's are the Agate look's, each under a story's
 * heavy rule. The front page's (#240) are ruled columns, as the roundup's leads are: a hairline
 * between, an ink rule under the row.
 */
export function PieceGrid({ pieces, look }: { pieces: readonly Piece[]; look: "front" | "agate" }) {
  const front = look === "front";
  return (
    <div
      className={
        front
          ? `${columns(pieces.length)} border-t-0`
          : "grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-7 md:gap-8"
      }
    >
      {pieces.map((piece, index) => (
        <article
          key={piece.slug}
          data-slot="piece"
          className={
            front
              ? `gap-[10px] ${column(index, pieces.length)}`
              : `flex min-w-0 flex-col gap-[10px] ${storyRule}`
          }
        >
          <p
            data-slot="piece-kicker"
            className={
              front
                ? flag
                : "font-label text-kicker text-tag uppercase leading-[1.35] tracking-kicker"
            }
          >
            {pieceKicker(piece)}
          </p>
          {/* One piece alone has the whole row: its lines stop at a column's measure. */}
          <h3
            data-slot="piece-headline"
            className={`max-w-[680px] text-balance font-serif font-strong tracking-[-0.01em] ${front ? "text-[24px] leading-[1.15]" : "text-[26px] leading-[1.12]"}`}
          >
            <Link
              href={pieceHref(piece.slug)}
              className={`${link} tap-target ${front ? "hover:text-kicker" : "hover:underline hover:decoration-2"}`}
            >
              {unbroken(piece.headline)}
            </Link>
          </h3>
          <p
            data-slot="piece-deck"
            className={`line-clamp-5 max-w-[680px] ${front ? "" : "font-serif text-note text-prose"}`}
          >
            {unbroken(pieceDeck(piece.body))}
          </p>
          <p
            data-slot="piece-byline"
            className={front ? "font-agate text-[13px] text-muted-foreground" : storyOnTv}
          >
            {WRITTEN_BY} · <LocalTime at={piece.writtenAt} show="day" /> ·{" "}
            <LocalTime at={piece.writtenAt} show="time" />
          </p>
        </article>
      ))}
    </div>
  );
}

/**
 * The written pieces (#217), between the briefs and ESPN's headlines.
 *
 * With no pieces (`null`: none published in the last 30 hours, or D1 not answering) nothing is
 * drawn at all, no title and no gap.
 */
export function HomePieces({ pieces }: { pieces: Piece[] | null }) {
  if (pieces == null || pieces.length === 0) return null;
  return (
    <section aria-labelledby="pieces-heading" data-slot="pieces" className="pt-7">
      <div className={sectionHead}>
        <h2 id="pieces-heading" className={sectionTitle}>
          {PIECES_LABEL}
        </h2>
      </div>
      <PieceGrid pieces={pieces} look="front" />
    </section>
  );
}
