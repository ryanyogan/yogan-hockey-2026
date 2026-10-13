import { env } from "cloudflare:workers";
import type { StoredPiece, WritingFacts } from "@yogan-hockey/schemas";
import { expect, test } from "vitest";
import { createDb } from "./client.ts";
import { getCurrentPieces, getPieceBySlug, getRejectedPieces, savePiece } from "./pieces.ts";

const db = createDb(env.DB);

const FACTS: WritingFacts = {
  date: "2026-10-12",
  day: "Monday, October 12",
  teams: [],
  finalsDay: null,
  finals: [],
  slate: [],
};

type Overrides = { kind: string; date?: string; writtenAt?: string; headline?: string };

/** The tests share one database, so each uses kinds of its own. */
function published({ kind, date = "2026-10-12", ...rest }: Overrides): StoredPiece {
  return {
    slug: `${date}-${kind}`,
    kind,
    date,
    status: "published",
    headline: "Kraken win again",
    body: "The Kraken won.\n\nThey play again Tuesday.",
    writtenAt: "2026-10-12T15:20:00.000Z",
    model: "@cf/openai/gpt-oss-120b",
    writtenBy: "model",
    facts: FACTS,
    ...rest,
  };
}

function rejected(overrides: Overrides): StoredPiece {
  return {
    ...published(overrides),
    status: "rejected",
    reasons: ['"McDavid" is not in the facts'],
  };
}

test("a published piece is read back by its slug, without the facts it was written from", async () => {
  expect(await savePiece(db, published({ kind: "read-back" }))).toBe(true);

  const piece = await getPieceBySlug(db, "2026-10-12-read-back");

  expect(piece).toEqual({
    slug: "2026-10-12-read-back",
    kind: "read-back",
    date: "2026-10-12",
    headline: "Kraken win again",
    body: "The Kraken won.\n\nThey play again Tuesday.",
    writtenAt: "2026-10-12T15:20:00.000Z",
    model: "@cf/openai/gpt-oss-120b",
    writtenBy: "model",
  });
});

test("a slug nothing was written at reads as null", async () => {
  expect(await getPieceBySlug(db, "2026-10-12-nothing")).toBeNull();
});

test("a rejected piece is kept with its reasons and is never read by a page", async () => {
  expect(await savePiece(db, rejected({ kind: "refused" }))).toBe(true);

  expect(await getPieceBySlug(db, "2026-10-12-refused")).toBeNull();
  expect(await getCurrentPieces(db, ["refused"])).toEqual([]);
  expect(await getRejectedPieces(db, "2026-10-12-refused")).toMatchObject([
    { status: "rejected", reasons: ['"McDavid" is not in the facts'] },
  ]);
});

test("the last good piece of a kind stays up when a later one is rejected", async () => {
  await savePiece(db, published({ kind: "stays-up", date: "2026-10-11", headline: "Sunday's" }));
  await savePiece(
    db,
    rejected({ kind: "stays-up", date: "2026-10-12", writtenAt: "2026-10-13T15:20:00.000Z" }),
  );

  const current = await getCurrentPieces(db, ["stays-up"]);

  expect(current.map(({ slug, headline }) => [slug, headline])).toEqual([
    ["2026-10-11-stays-up", "Sunday's"],
  ]);
});

test("the current pieces are the newest of each kind, newest first", async () => {
  await savePiece(
    db,
    published({ kind: "cur-a", date: "2026-10-10", writtenAt: "2026-10-10T15:00:00.000Z" }),
  );
  await savePiece(
    db,
    published({ kind: "cur-a", date: "2026-10-12", writtenAt: "2026-10-12T15:00:00.000Z" }),
  );
  await savePiece(
    db,
    published({ kind: "cur-b", date: "2026-10-12", writtenAt: "2026-10-13T05:00:00.000Z" }),
  );

  const current = await getCurrentPieces(db, ["cur-a", "cur-b"]);

  expect(current.map(({ slug }) => slug)).toEqual(["2026-10-12-cur-b", "2026-10-12-cur-a"]);
  expect(await getCurrentPieces(db, [])).toEqual([]);
  const everything = (await getCurrentPieces(db)).map(({ slug }) => slug);
  expect(everything).toContain("2026-10-12-cur-a");
  expect(everything).not.toContain("2026-10-10-cur-a");
});

test("a date and a kind have one published piece: a second is refused and the first stands", async () => {
  await savePiece(db, published({ kind: "once", headline: "The first" }));

  expect(await savePiece(db, published({ kind: "once", headline: "The second" }))).toBe(false);
  // A rejected try at the same slug is still kept, and changes nothing a page reads.
  expect(await savePiece(db, rejected({ kind: "once" }))).toBe(true);

  expect((await getPieceBySlug(db, "2026-10-12-once"))?.headline).toBe("The first");
});

test("a row that does not fit the schema is refused", async () => {
  const unmarked = { ...published({ kind: "unmarked" }), writtenBy: "a person" };
  await expect(savePiece(db, unmarked as unknown as StoredPiece)).rejects.toThrow();
  const noReasons = { ...rejected({ kind: "unmarked" }), reasons: [] };
  await expect(savePiece(db, noReasons)).rejects.toThrow();

  expect(await getRejectedPieces(db, "2026-10-12-unmarked")).toEqual([]);
});

test("a row written around the schema with no verdict is refused by the table itself", async () => {
  const insert = env.DB.prepare(
    `insert into pieces (slug, kind, date, status, headline, body, written_at, model, written_by, facts)
     values ('2026-10-12-raw', 'raw', '2026-10-12', ?, 'h', 'b', '2026-10-12T15:00:00.000Z', 'm', 'model', '{}')`,
  );
  await expect(insert.bind("unchecked").run()).rejects.toThrow();
  await expect(insert.bind("rejected").run()).rejects.toThrow();
});
