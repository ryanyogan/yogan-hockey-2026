import {
  type Piece,
  PieceSchema,
  type StoredPiece,
  StoredPieceSchema,
} from "@yogan-hockey/schemas";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "./client.ts";
import { pieces } from "./schema.ts";

/** What a page is given of a piece: everything but the facts it was written from. */
const PIECE_COLUMNS = {
  slug: pieces.slug,
  kind: pieces.kind,
  date: pieces.date,
  headline: pieces.headline,
  body: pieces.body,
  writtenAt: pieces.writtenAt,
  model: pieces.model,
  writtenBy: pieces.writtenBy,
};

const isPublished = eq(pieces.status, "published");

/**
 * Stores a piece the check has read: published, or rejected with its reasons. Returns whether the
 * row was kept: a date and a kind have one published piece, so a second is refused and the first
 * stands. Throws, and writes nothing, when the row does not fit `StoredPieceSchema`.
 */
export async function savePiece(db: Db, piece: StoredPiece): Promise<boolean> {
  const { facts, ...row } = StoredPieceSchema.parse(piece);
  const inserted = await db
    .insert(pieces)
    .values({ ...row, reasons: row.status === "rejected" ? row.reasons : null, facts })
    .onConflictDoNothing()
    .returning({ id: pieces.id });
  return inserted.length === 1;
}

/**
 * The pieces a page shows now: the newest published piece of each kind, newest first. A kind
 * whose latest try was rejected still has its last good piece here, which is how a failure leaves
 * the page as it was. A rejected piece is never among them. With `kinds`, only those kinds.
 */
export async function getCurrentPieces(db: Db, kinds?: readonly string[]): Promise<Piece[]> {
  if (kinds?.length === 0) return [];
  const newestOfItsKind = sql`${pieces.id} = (
    select newest.id from pieces newest
    where newest.kind = ${pieces.kind} and newest.status = 'published'
    order by newest.written_at desc, newest.id desc limit 1
  )`;
  const rows = await db
    .select(PIECE_COLUMNS)
    .from(pieces)
    .where(and(isPublished, newestOfItsKind, kinds ? inArray(pieces.kind, [...kinds]) : undefined))
    .orderBy(desc(pieces.writtenAt), desc(pieces.id));
  return rows.map((row) => PieceSchema.parse(row));
}

/** The published piece at a slug, or null: there is none, or the only tries were rejected. */
export async function getPieceBySlug(db: Db, slug: string): Promise<Piece | null> {
  const [row] = await db
    .select(PIECE_COLUMNS)
    .from(pieces)
    .where(and(isPublished, eq(pieces.slug, slug)));
  return row ? PieceSchema.parse(row) : null;
}

/** Every try at a slug that the check refused, oldest first: for reading a failure afterwards. */
export async function getRejectedPieces(db: Db, slug: string): Promise<StoredPiece[]> {
  const rows = await db
    .select()
    .from(pieces)
    .where(and(eq(pieces.status, "rejected"), eq(pieces.slug, slug)))
    .orderBy(pieces.id);
  return rows.map(({ id: _id, ...row }) => StoredPieceSchema.parse(row));
}
