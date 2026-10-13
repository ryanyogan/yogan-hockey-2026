import { env } from "cloudflare:workers";
import { createDb, savePiece } from "@yogan-hockey/db";
import type { Piece } from "@yogan-hockey/schemas";

/*
 * Scaffolding for #217: written pieces to look at in fixture mode, where no model writes any.
 * They are in the site's voice and about what fixture mode shows: the preview and the standings
 * note are of the recorded slate (Tue Oct 6) and standings, with the sample picks of
 * `sample-picks.ts`, and the recap, dated the night before, is of the three finals the Agate
 * prototype's first slate has, since no recorded slate has a night of finals. The Agate
 * prototype draws the same three (`prototypes/agate/data.js`), which is what lets
 * `scripts/agate-home-compare.mjs` measure Home against it word for word.
 */

const MODEL = "@cf/openai/gpt-oss-120b";

const piece = (
  kind: string,
  date: string,
  writtenAt: string,
  headline: string,
  paragraphs: string[],
): Piece => ({
  slug: `${date}-${kind}`,
  kind,
  date,
  headline,
  body: paragraphs.join("\n\n"),
  writtenAt,
  model: MODEL,
  writtenBy: "model",
});

/** Newest first, as `getCurrentPieces` answers. */
export const SAMPLE_PIECES: Piece[] = [
  piece(
    "league",
    "2026-10-06",
    "2026-10-06T15:17:00Z",
    "Rangers lead the East as Edmonton and Winnipeg share the top of the West",
    [
      "The Rangers have the most points in the East, 6, from three wins in four games. Ottawa has played twice and won twice.",
      "In the West, Edmonton and Winnipeg have 5 points each at 2-0-1. Colorado, Minnesota and Anaheim have each won their first two games.",
      "It is early. No team in either top eight has played more than four games, and tonight's nine will move most of these places.",
    ],
  ),
  piece(
    "preview",
    "2026-10-06",
    "2026-10-06T15:16:00Z",
    "Nine games tonight, and Buffalo is the firmest pick on the board",
    [
      "Nine games are on tonight's slate, five of them starting at 7 p.m. Eastern. The Senators, 2-0-0, visit a Red Wings team still looking for a first win at 0-2-0.",
      "The site's firmest pick is Buffalo, at 64 percent, at home against a Wild team that has won both of its games. Los Angeles is next at 62 percent against Florida, and New Jersey is at 61 percent against Utah.",
      "The closest call is in Montreal, where the Canadiens are the pick over Carolina at 52 percent. Toronto is the pick over Nashville at 58 percent, and Seattle is the pick over Vegas at 59 percent in the late game.",
    ],
  ),
  piece(
    "recap",
    "2026-10-05",
    "2026-10-06T05:06:00Z",
    "Kraken win 5-3 in Washington, and the Rangers and Hurricanes win by more",
    [
      "The Kraken won 5-3 in Washington on Monday. The Capitals were the site's pick at 63 percent, and that pick was wrong.",
      "The Rangers beat the Canucks 6-2 at Madison Square Garden. The site had New York at 62 percent, and that pick was right.",
      "The Hurricanes won 4-1 in Philadelphia. Carolina was the pick at 78 percent, which made it two right out of three on the night.",
    ],
  ),
];

/**
 * The Picks page's columns (#218), in a columnist's voice and under the Writer's rules: every
 * club, score and chance is one the sample picks hold (`sample-picks.ts`: the season is 3 right
 * and 2 wrong, Monday was 2 of 3, and eight of tonight's nine games have a pick), and nobody is
 * quoted. The Agate prototype draws the same three (`prototypes/agate/data.js`).
 */
export const SAMPLE_COLUMNS: Piece[] = [
  piece(
    "picks-run",
    "2026-10-06",
    "2026-10-06T15:20:00Z",
    "Two right in a row, and a 3-2 record that one game could turn over",
    [
      "The picks are 3-2 on the season after going 2 for 3 on Monday. That is a winning record by the width of one game, which is the only width a record of five games has.",
      "The last two came in: the Rangers at 62 percent and the Hurricanes at 78 percent. The home team has been the pick four times and won twice. The road team has been the pick once, and Carolina won.",
      "None of it means much yet. Eight picks are on tonight's board, and by the morning the record will have more than doubled its games.",
    ],
  ),
  piece(
    "picks-miss",
    "2026-10-06",
    "2026-10-06T15:19:00Z",
    "Washington at 63 percent is the pick this week would like back",
    [
      "Every week has one pick it would like back. This week's came on Monday in Washington, where the Capitals were our pick at 63 percent and the Kraken won 5-3.",
      "It was the only wrong pick of Monday's three. The Rangers, at 62 percent, beat the Canucks 6-2, and the Hurricanes, at 78 percent, won 4-1 in Philadelphia.",
      "A pick at 63 percent is not a promise, and nobody here took it for one. This one lost by two goals, and it goes in the wrong column with no excuse attached.",
    ],
  ),
  piece(
    "picks-tonight",
    "2026-10-06",
    "2026-10-06T15:18:00Z",
    "Buffalo at 64 percent is the firmest pick tonight, and Montreal is barely a pick at all",
    [
      "The game to watch tonight is in Buffalo. The Sabres are our pick at 64 percent, the firmest on a board of nine games, against a Wild team that has won both of its games.",
      "That is the pick with the most to lose. Minnesota is 2-0-0, and a miss here would be the firmest wrong pick of the season, past Washington at 63 percent on Monday.",
      "The other end of the board is in Montreal, where the Canadiens are the pick over Carolina at 52 percent. At 52 the pick is a lean and no more.",
    ],
  ),
];

/** The facts a sample piece is stored with: none, since no model was sent any. */
const NO_FACTS = (date: string) => ({
  date,
  day: "A sample",
  teams: [],
  finalsDay: null,
  finals: [],
  slate: [],
});

/**
 * Leaves the sample pieces and the sample columns, and no others, in D1. Fixture mode only, where nothing else writes a
 * piece: emptying the table also takes samples an earlier build seeded under other dates, which
 * would otherwise stand as the newest of their kinds.
 */
export async function seedSamplePieces(): Promise<void> {
  if (process.env.ESPN_FIXTURES !== "1") throw new Error("Sample pieces are for fixture mode");
  await env.DB.prepare("DELETE FROM pieces").run();
  const db = createDb(env.DB);
  for (const sample of [...SAMPLE_PIECES, ...SAMPLE_COLUMNS]) {
    await savePiece(db, { ...sample, status: "published", facts: NO_FACTS(sample.date) });
  }
}
