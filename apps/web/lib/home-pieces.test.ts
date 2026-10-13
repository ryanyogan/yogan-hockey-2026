import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { createDb, savePiece } from "@yogan-hockey/db";
import type { StoredPiece } from "@yogan-hockey/schemas";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { readHomePieces, readPiece } from "./home-pieces";
import { SAMPLE_PIECES, seedSamplePieces } from "./sample-pieces";

// The router's link needs a router; a piece's link is tested as an address.
vi.mock("../components/link", () => ({
  Link: ({ href, children, ...props }: { href: string; children: unknown }) =>
    createElement("a", { href, ...props }, children as never),
}));
const { HomePieces } = await import("../components/dashboard/pieces");

const failures = vi.spyOn(console, "error").mockImplementation(() => {});

const FACTS = {
  date: "2026-10-12",
  day: "Monday",
  teams: [],
  finalsDay: null,
  finals: [],
  slate: [],
};
const stored = (kind: string, date: string, writtenAt: string): StoredPiece => ({
  slug: `${date}-${kind}`,
  kind,
  date,
  headline: `The ${kind} of ${date}`,
  body: "First paragraph.\n\nSecond paragraph.",
  writtenAt,
  model: "@cf/openai/gpt-oss-120b",
  writtenBy: "model",
  status: "published",
  facts: FACTS,
});

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  vi.stubEnv("ESPN_FIXTURES", "");
  await env.DB.exec("DELETE FROM pieces");
});

afterEach(() => {
  vi.unstubAllEnvs();
  failures.mockClear();
});

describe("Home's pieces", () => {
  it("are null while nothing is published, and the section is not drawn at all", async () => {
    const pieces = await readHomePieces(new Date("2026-10-12T18:00:00Z"));
    expect(pieces).toBeNull();
    expect(renderToStaticMarkup(createElement(HomePieces, { pieces }))).toBe("");
    expect(renderToStaticMarkup(createElement(HomePieces, { pieces: [] }))).toBe("");
  });

  it("are the newest published of each kind, and never a rejected one", async () => {
    const db = createDb(env.DB);
    await savePiece(db, stored("preview", "2026-10-11", "2026-10-11T15:16:00Z"));
    await savePiece(db, stored("preview", "2026-10-12", "2026-10-12T15:16:00Z"));
    await savePiece(db, stored("recap", "2026-10-11", "2026-10-12T05:06:00Z"));
    await savePiece(db, {
      ...stored("league", "2026-10-12", "2026-10-12T15:17:00Z"),
      status: "rejected",
      reasons: ["names a team that is not in the facts"],
    });
    const pieces = await readHomePieces(new Date("2026-10-12T18:00:00Z"));
    expect(pieces?.map(({ slug }) => slug)).toEqual(["2026-10-12-preview", "2026-10-11-recap"]);
  });

  it("are null once every piece is more than 30 hours old: the Writer has been failing", async () => {
    await savePiece(createDb(env.DB), stored("recap", "2026-10-11", "2026-10-12T05:06:00Z"));
    expect(await readHomePieces(new Date("2026-10-13T11:00:00Z"))).toHaveLength(1);
    expect(await readHomePieces(new Date("2026-10-15T05:00:00Z"))).toBeNull();
  });

  it("are null, and the failure logged, when D1 does not answer", async () => {
    await env.DB.exec("ALTER TABLE pieces RENAME TO pieces_away");
    try {
      expect(await readHomePieces()).toBeNull();
      expect(failures).toHaveBeenCalledWith(
        "The written pieces could not be read",
        expect.anything(),
      );
    } finally {
      await env.DB.exec("ALTER TABLE pieces_away RENAME TO pieces");
    }
  });

  it("in fixture mode are the three samples, whatever today is", async () => {
    vi.stubEnv("ESPN_FIXTURES", "1");
    await seedSamplePieces();
    await seedSamplePieces();
    const pieces = await readHomePieces(new Date("2031-01-01T00:00:00Z"));
    expect(pieces?.map(({ kind }) => kind)).toEqual(["preview", "recap", "league"]);
    expect(pieces).toEqual(expect.arrayContaining(SAMPLE_PIECES));
  });

  it("are drawn with the headline as a link to the piece's page, the first paragraph, and that a model wrote it and when", async () => {
    await savePiece(createDb(env.DB), stored("preview", "2026-10-12", "2026-10-12T15:16:00Z"));
    const pieces = await readHomePieces(new Date("2026-10-12T18:00:00Z"));
    const html = renderToStaticMarkup(createElement(HomePieces, { pieces }));
    expect(html).toContain("Notes on the league");
    expect(html).toContain("Preview · Mon Oct 12");
    expect(html).toContain('href="/pieces/2026-10-12-preview"');
    expect(html).toContain("The preview of ");
    expect(html).toContain("First paragraph.");
    expect(html).not.toContain("Second paragraph.");
    expect(html).toContain("Written by a model");
    // The server knows Eastern time, and marks it.
    expect(html).toContain('<time dateTime="2026-10-12T15:16:00Z">11:16 AM ET</time>');
  });
});

describe("a piece's page", () => {
  beforeEach(async () => {
    const db = createDb(env.DB);
    await savePiece(db, stored("preview", "2026-10-12", "2026-10-12T15:16:00Z"));
    await savePiece(db, {
      ...stored("recap", "2026-10-11", "2026-10-12T05:06:00Z"),
      status: "rejected",
      reasons: ["a score no final reached"],
    });
  });

  it("reads the published piece at its slug, however old", async () => {
    expect(await readPiece("2026-10-12-preview")).toMatchObject({
      slug: "2026-10-12-preview",
      headline: "The preview of 2026-10-12",
      writtenBy: "model",
    });
  });

  it("finds nothing at a slug nothing was written for, one only refused, or one of another shape", async () => {
    expect(await readPiece("2026-10-13-preview")).toBeNull();
    expect(await readPiece("2026-10-11-recap")).toBeNull();
    expect(await readPiece("preview")).toBeNull();
    expect(await readPiece("2026-10-12-preview' or 1=1")).toBeNull();
  });
});
