import type { Piece } from "@yogan-hockey/schemas";
import {
  howWritten,
  piecePageKicker,
  pieceParagraphs,
  unbroken,
  WRITTEN_BY,
} from "../../lib/piece-copy";
import { Link } from "../link";
import { LocalTime } from "../local-time";
import { storyOnTv, storyRule } from "../story/type";

/**
 * A written piece on its own page (`/pieces/:slug`, #217), opened as a story is: the heavy rule,
 * a red line saying what it is and the day it is about, and its headline, which is the page's
 * `h1`. Under the headline, in agate, that a model wrote it and when; then its paragraphs in the
 * serif at a column's measure; then, under a hairline in small agate, which model and how the
 * piece was checked. The words of the piece are the model's and are printed as plain text.
 *
 * The kicker and the headline are a story's (`components/story/type.ts`) but for their figures,
 * which are tabular here as on every page but Home (`scripts/agate-routes.mjs` checks).
 */
/** Each paragraph with a key of its own: nothing stops a piece saying the same one twice. */
function keyed(paragraphs: string[]): [key: string, paragraph: string][] {
  const seen = new Map<string, number>();
  return paragraphs.map((paragraph) => {
    const times = seen.get(paragraph) ?? 0;
    seen.set(paragraph, times + 1);
    return [`${times} ${paragraph}`, paragraph];
  });
}

export function PiecePage({ piece }: { piece: Piece }) {
  return (
    <>
      <article data-slot="piece-page" className={`flex flex-col gap-3 ${storyRule}`}>
        <p
          data-slot="kicker"
          className="font-label text-kicker text-tag uppercase leading-[1.35] tracking-kicker"
        >
          {piecePageKicker(piece)}
        </p>
        <h1 className="max-w-[760px] text-balance font-serif font-strong text-headline [font-variation-settings:'opsz'_60]">
          {unbroken(piece.headline)}
        </h1>
        <p data-slot="piece-byline" className={storyOnTv}>
          {WRITTEN_BY} · <LocalTime at={piece.writtenAt} show="day" /> ·{" "}
          <LocalTime at={piece.writtenAt} show="time" />
        </p>
        <div data-slot="piece-body" className="mt-1 flex max-w-[680px] flex-col gap-[14px]">
          {keyed(pieceParagraphs(piece.body)).map(([key, paragraph]) => (
            <p key={key} className="font-serif text-deck leading-[1.5]">
              {unbroken(paragraph)}
            </p>
          ))}
        </div>
        <p
          data-slot="piece-how"
          className="mt-2 max-w-[680px] border-border border-t pt-3 text-[13px] text-aside leading-[1.5]"
        >
          {howWritten(piece.model)}
        </p>
      </article>
      <p className="font-label text-small uppercase tracking-head">
        <Link href="/" className="tap-target underline">
          back to tonight
        </Link>
      </p>
    </>
  );
}
