import { env } from "cloudflare:workers";
import { createDb, getCurrentPieces, getPieceBySlug } from "@yogan-hockey/db";
import { type Piece, PieceSlugSchema } from "@yogan-hockey/schemas";
import { COLUMN_KINDS, columnPieces, HOME_KINDS, homePieces } from "./piece-copy";

/**
 * The written pieces Home shows (#217), or null when there are none: none published yet, none
 * written in the last 30 hours (`homePieces`), or D1 not answering. All three are the same to
 * Home, which leaves the section out and draws the rest, so this never rejects.
 *
 * Fixture mode has no clock: its pieces are the samples of one recorded day, shown whatever today is.
 */
export async function readHomePieces(now: Date = new Date()): Promise<Piece[] | null> {
  try {
    const current = await getCurrentPieces(createDb(env.DB), HOME_KINDS);
    const shown = homePieces(current, process.env.ESPN_FIXTURES === "1" ? null : now);
    return shown.length > 0 ? shown : null;
  } catch (error) {
    console.error("The written pieces could not be read", error);
    return null;
  }
}

/**
 * The Picks page's columns (#218), read and aged as Home's pieces are, or null when there are
 * none to show. It never rejects: the page is drawn without them.
 */
export async function readColumns(now: Date = new Date()): Promise<Piece[] | null> {
  try {
    const current = await getCurrentPieces(createDb(env.DB), COLUMN_KINDS);
    const shown = columnPieces(current, process.env.ESPN_FIXTURES === "1" ? null : now);
    return shown.length > 0 ? shown : null;
  } catch (error) {
    console.error("The Picks page's columns could not be read", error);
    return null;
  }
}

/**
 * The published piece at a slug, or null when the address is no piece's: a slug of another shape
 * (which D1 is not asked about), one nothing was written for, or one whose every try was refused.
 */
export async function readPiece(slug: string): Promise<Piece | null> {
  if (!PieceSlugSchema.safeParse(slug).success) return null;
  return getPieceBySlug(createDb(env.DB), slug);
}
