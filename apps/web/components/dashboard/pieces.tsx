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
import { storyKicker, storyOnTv, storyRule } from "../story/type";
import { label, link } from "./agate";

/**
 * The written pieces (#217), between the briefs and ESPN's headlines, in the leads' grid: each
 * under a story's heavy rule, with a red line saying what it is and the day it is about, a serif
 * headline that links to its page, its first paragraph cut at five lines, and in agate that a
 * model wrote it and when. The headline is smaller than a lead's: a piece's is a sentence of up
 * to ninety letters, where a lead's is two clubs and a score.
 *
 * With no pieces (`null`: none published in the last 30 hours, or D1 not answering) nothing is
 * drawn at all, no label and no gap.
 */
export function HomePieces({ pieces }: { pieces: Piece[] | null }) {
  if (pieces == null || pieces.length === 0) return null;
  return (
    <section aria-labelledby="pieces-heading" data-slot="pieces" className="mt-8 md:mt-11">
      <h2 id="pieces-heading" className={`${label} mb-4`}>
        {PIECES_LABEL}
      </h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-7 md:gap-8">
        {pieces.map((piece) => (
          <article
            key={piece.slug}
            data-slot="piece"
            className={`flex min-w-0 flex-col gap-[10px] ${storyRule}`}
          >
            <p data-slot="piece-kicker" className={storyKicker}>
              {pieceKicker(piece)}
            </p>
            {/* One piece alone has the whole row: its lines stop at a column's measure. */}
            <h3
              data-slot="piece-headline"
              className="max-w-[680px] text-balance font-serif font-strong text-[26px] normal-nums leading-[1.12] tracking-[-0.01em]"
            >
              <Link
                href={pieceHref(piece.slug)}
                className={`${link} tap-target hover:underline hover:decoration-2`}
              >
                {unbroken(piece.headline)}
              </Link>
            </h3>
            <p
              data-slot="piece-deck"
              className="line-clamp-5 max-w-[680px] font-serif text-note text-prose normal-nums"
            >
              {unbroken(pieceDeck(piece.body))}
            </p>
            <p data-slot="piece-byline" className={storyOnTv}>
              {WRITTEN_BY} · <LocalTime at={piece.writtenAt} show="day" /> ·{" "}
              <LocalTime at={piece.writtenAt} show="time" />
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
