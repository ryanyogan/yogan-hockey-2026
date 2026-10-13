import type { Piece } from "@yogan-hockey/schemas";
import { describe, expect, it } from "vitest";
import {
  columnPieces,
  homePieces,
  howWritten,
  pieceDeck,
  pieceHref,
  pieceKicker,
  piecePageKicker,
  pieceParagraphs,
  unbroken,
} from "./piece-copy";

const piece = (kind: string, writtenAt: string, date = writtenAt.slice(0, 10)): Piece => ({
  slug: `${date}-${kind}`,
  kind,
  date,
  headline: `The ${kind}`,
  body: "One.\n\nTwo.",
  writtenAt,
  model: "@cf/openai/gpt-oss-120b",
  writtenBy: "model",
});

const kinds = (pieces: Piece[]) => pieces.map(({ kind }) => kind);

describe("the pieces Home shows", () => {
  const recap = piece("recap", "2026-10-12T05:06:00Z", "2026-10-11");
  const preview = piece("preview", "2026-10-12T15:16:00Z");
  const league = piece("league", "2026-10-12T15:17:00Z");
  // Newest first, as the store answers.
  const current = [league, preview, recap];

  it("are in Home's order whatever order they were written in: preview, recap, standings", () => {
    expect(kinds(homePieces(current, new Date("2026-10-12T18:00:00Z")))).toEqual([
      "preview",
      "recap",
      "league",
    ]);
  });

  it("leave Home 30 hours after they were written, each by itself", () => {
    // The recap's 30 hours end at 11:06 UTC on the 13th; the morning's at 21:16 and 21:17.
    expect(kinds(homePieces(current, new Date("2026-10-13T11:06:00Z")))).toContain("recap");
    expect(kinds(homePieces(current, new Date("2026-10-13T11:06:01Z")))).toEqual([
      "preview",
      "league",
    ]);
    expect(kinds(homePieces(current, new Date("2026-10-13T21:16:30Z")))).toEqual(["league"]);
    expect(homePieces(current, new Date("2026-10-13T21:17:01Z"))).toEqual([]);
  });

  it("do not include a recap from three days ago while the Writer is failing", () => {
    expect(homePieces([recap], new Date("2026-10-14T06:00:00Z"))).toEqual([]);
  });

  it("are Home's own kinds and no others: a column of the Picks page is not among them", () => {
    const column = piece("picks-miss", "2026-10-12T16:00:00Z");
    const letter = piece("letter", "2026-10-12T15:30:00Z");
    const now = new Date("2026-10-12T18:00:00Z");
    expect(kinds(homePieces([column, letter, league, preview], now))).toEqual([
      "preview",
      "league",
    ]);
  });

  it("are all of them when there is no clock, as in fixture mode", () => {
    expect(homePieces(current, null)).toHaveLength(3);
  });
});

describe("the Picks page's columns", () => {
  const miss = piece("picks-miss", "2026-10-12T15:20:00Z");
  const run = piece("picks-run", "2026-10-12T15:21:00Z");
  const tonight = piece("picks-tonight", "2026-10-12T15:22:00Z");

  it("are the column kinds in the page's order, and none of Home's", () => {
    const now = new Date("2026-10-12T18:00:00Z");
    const preview = piece("preview", "2026-10-12T15:16:00Z");
    expect(kinds(columnPieces([run, miss, preview, tonight], now))).toEqual([
      "picks-tonight",
      "picks-miss",
      "picks-run",
    ]);
  });

  it("leave the page 30 hours after they were written, as Home's pieces do", () => {
    expect(columnPieces([miss], new Date("2026-10-13T21:20:01Z"))).toEqual([]);
    expect(columnPieces([miss], null)).toHaveLength(1);
  });

  it("are the two written on a morning with no new miss, once yesterday's miss has had its 30 hours (#234)", () => {
    const nextTonight = piece("picks-tonight", "2026-10-13T15:19:00Z");
    const nextRun = piece("picks-run", "2026-10-13T15:21:00Z");
    const current = [nextRun, nextTonight, miss];

    // Tuesday afternoon: Monday's column on the miss is still up, between the other two.
    expect(kinds(columnPieces(current, new Date("2026-10-13T18:00:00Z")))).toEqual([
      "picks-tonight",
      "picks-miss",
      "picks-run",
    ]);
    // Tuesday night: it has gone, and the page has the two.
    expect(kinds(columnPieces(current, new Date("2026-10-13T22:00:00Z")))).toEqual([
      "picks-tonight",
      "picks-run",
    ]);
  });

  it("have a line of their own above the headline", () => {
    expect(pieceKicker({ kind: "picks-tonight", date: "2026-10-12" })).toBe(
      "Tonight's game · Mon Oct 12",
    );
    expect(pieceKicker({ kind: "picks-miss", date: "2026-10-12" })).toBe("The miss · Mon Oct 12");
    expect(pieceKicker({ kind: "picks-run", date: "2026-10-12" })).toBe("The record · Mon Oct 12");
  });
});

describe("the words around a piece", () => {
  it("names the kind and the day the piece is about", () => {
    expect(pieceKicker({ kind: "preview", date: "2026-10-12" })).toBe("Preview · Mon Oct 12");
    expect(pieceKicker({ kind: "recap", date: "2026-10-11" })).toBe("Recap · Sun Oct 11");
    expect(pieceKicker({ kind: "league", date: "2026-10-12" })).toBe("Standings · Mon Oct 12");
    expect(piecePageKicker({ kind: "recap", date: "2026-10-11" })).toBe(
      "Recap · Sunday, October 11",
    );
  });

  it("calls a kind it has no word for the league's", () => {
    expect(pieceKicker({ kind: "picks-column", date: "2026-10-12" })).toBe(
      "The league · Mon Oct 12",
    );
  });

  it("reads a body as paragraphs parted by blank lines, and Home's deck as the first", () => {
    expect(pieceParagraphs("One.\n\nTwo, on\none line.\n \n\nThree.\n")).toEqual([
      "One.",
      "Two, on\none line.",
      "Three.",
    ]);
    expect(pieceDeck("One.\n\nTwo.")).toBe("One.");
    expect(pieceDeck("")).toBe("");
  });

  it("keeps a score and a record on one line, and changes nothing else", () => {
    const J = "\u2060";
    expect(unbroken("The Senators, 2-0-0, won 5-3 in a first-period rush.")).toBe(
      `The Senators, 2${J}-${J}0${J}-${J}0, won 5${J}-${J}3 in a first-period rush.`,
    );
    expect(unbroken("No figures here.")).toBe("No figures here.");
  });

  it("gives a piece its address, and says which model wrote it and that it was checked", () => {
    expect(pieceHref("2026-10-12-preview")).toBe("/pieces/2026-10-12-preview");
    const note = howWritten("@cf/openai/gpt-oss-120b");
    expect(note).toContain("A model (@cf/openai/gpt-oss-120b) wrote this");
    expect(note).toContain("checked it against those figures");
    expect(note).toContain("every pick is the site's own");
  });
});
