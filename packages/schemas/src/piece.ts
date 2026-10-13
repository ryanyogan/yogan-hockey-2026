import { z } from "zod";

/**
 * A written piece (#217): a short article on the league, or a column on the picks (#218), written
 * by a model from facts the site holds and checked against those facts before it is stored.
 */

/**
 * What sort of piece it is: "recap", "preview", "league". A plain word and not a fixed list, so
 * another page's pieces (the Picks page's columns) are new kinds and no migration.
 */
export const PieceKindSchema = z.string().regex(/^[a-z][a-z-]{1,30}$/);

/** A pick as a piece is told it: the team by abbreviation, and its chance as a percentage. */
const FactPickSchema = z.object({
  team: z.string().min(1),
  winProbability: z.number().int().min(0).max(100),
});

/** One team as a piece is told it. Only the names and the record are always known. */
export const FactTeamSchema = z.object({
  /** "SEA" */
  team: z.string().min(1),
  /** "Seattle Kraken" */
  name: z.string().min(1),
  /** "Seattle" */
  city: z.string().min(1),
  /** "Kraken" */
  nickname: z.string().min(1),
  /** Win-loss-overtime, "4-2-0". Null where ESPN sends none. */
  record: z.string().nullable(),
  /** The rest is the team's standings row, absent when the standings could not be read. */
  points: z.number().int().optional(),
  /** "Pacific Division" */
  division: z.string().optional(),
  /** "Western Conference" */
  conference: z.string().optional(),
  /** The team's place in its division, "2nd". */
  divisionPlace: z.string().optional(),
  /** "won 2 in a row", "lost 1", "lost 3 in a row in overtime or a shootout" */
  streak: z.string().optional(),
  homeRecord: z.string().optional(),
  roadRecord: z.string().optional(),
  lastTen: z.string().optional(),
  goalsFor: z.number().int().optional(),
  goalsAgainst: z.number().int().optional(),
});
export type FactTeam = z.infer<typeof FactTeamSchema>;

/** One goal of a finished game. */
export const FactGoalSchema = z.object({
  /** "1st", "2nd", "3rd", "OT" */
  period: z.string().min(1),
  /** How far into the period it was scored, "12:48". */
  time: z.string(),
  /** The scoring team's abbreviation. */
  team: z.string().min(1),
  scorer: z.string().min(1),
  assists: z.array(z.string().min(1)),
});
export type FactGoal = z.infer<typeof FactGoalSchema>;

/** A finished game. */
export const FactFinalSchema = z.object({
  /** ESPN's event id, which a page can link. */
  game: z.string().min(1),
  away: z.string().min(1),
  home: z.string().min(1),
  awayScore: z.number().int().nonnegative(),
  homeScore: z.number().int().nonnegative(),
  /** The winner's abbreviation. */
  winner: z.string().min(1),
  decidedIn: z.enum(["regulation", "overtime", "a shootout"]),
  /** In order. Null when the game's scoring could not be read; a shootout's attempts are left out. */
  goals: z.array(FactGoalSchema).nullable(),
  /** The site's Prediction for the game and how it did. Null when there was none. */
  pick: FactPickSchema.extend({ outcome: z.enum(["right", "wrong"]) }).nullable(),
});
export type FactFinal = z.infer<typeof FactFinalSchema>;

/** A game still to be played. */
export const FactGameSchema = z.object({
  game: z.string().min(1),
  away: z.string().min(1),
  home: z.string().min(1),
  /** "7:00 p.m. ET" */
  start: z.string().min(1),
  venue: z.string().nullable(),
  /** The site's Prediction. Null when it has none: a piece then says nothing of a pick. */
  pick: FactPickSchema.nullable(),
});
export type FactGame = z.infer<typeof FactGameSchema>;

/**
 * Everything a piece may say: the model is sent this and nothing else, and the check reads a
 * piece against it. A new source (ESPN's headlines, the picks' record) is a new optional field
 * here: the check takes its names and numbers from every value, whatever the field.
 */
export const WritingFactsSchema = z.object({
  /** The slate's date as the NHL counts it, `YYYY-MM-DD`. */
  date: z.iso.date(),
  /** "Monday, October 12" */
  day: z.string().min(1),
  teams: z.array(FactTeamSchema),
  /** The day the finals were played, "Sunday, October 11". Null when there are none. */
  finalsDay: z.string().nullable(),
  finals: z.array(FactFinalSchema),
  /** The games of `date` still to be played. */
  slate: z.array(FactGameSchema),
  /** People a piece may name beyond the scorers and their assists. */
  people: z.array(z.string().min(1)).optional(),
  /** How the site's picks have done this season. */
  picksRecord: z
    .object({ right: z.number().int().nonnegative(), wrong: z.number().int().nonnegative() })
    .optional(),
});
export type WritingFacts = z.infer<typeof WritingFactsSchema>;

const MAX_HEADLINE_LENGTH = 90;
const MIN_PARAGRAPHS = 2;
const MAX_PARAGRAPHS = 4;
const MIN_WORDS = 60;
const MAX_PARAGRAPH_LENGTH = 1200;
const MAX_WORDS = 260;

const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length;

/** What the model must answer: a headline and a few short paragraphs. */
export const PieceDraftSchema = z
  .object({
    headline: z
      .string()
      .trim()
      .min(1)
      .max(MAX_HEADLINE_LENGTH)
      .refine((text) => !/[\n.!]$/.test(text) && !text.includes("\n"), "One line, no full stop"),
    paragraphs: z
      .array(
        z
          .string()
          .trim()
          .min(1)
          // No paragraph of a piece this short is longer; it also bounds what the check reads.
          .max(MAX_PARAGRAPH_LENGTH)
          .refine((text) => !text.includes("\n"), "One paragraph each"),
      )
      .min(MIN_PARAGRAPHS)
      .max(MAX_PARAGRAPHS),
  })
  .refine(({ paragraphs }) => {
    const words = countWords(paragraphs.join(" "));
    return words >= MIN_WORDS && words <= MAX_WORDS;
  }, `Between ${MIN_WORDS} and ${MAX_WORDS} words`);
export type PieceDraft = z.infer<typeof PieceDraftSchema>;

/** The same shape as JSON Schema, for the model's schema-constrained mode. */
export const pieceDraftJsonSchema = {
  type: "object",
  properties: {
    headline: { type: "string" },
    paragraphs: {
      type: "array",
      minItems: MIN_PARAGRAPHS,
      maxItems: MAX_PARAGRAPHS,
      items: { type: "string" },
    },
  },
  required: ["headline", "paragraphs"],
  additionalProperties: false,
} as const;

/** A piece's address: its date and its kind, "2026-10-12-preview". One piece per kind a day. */
export const PieceSlugSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}-[a-z][a-z-]{1,30}$/);

/** The slug of the piece of one kind for one date. */
export const pieceSlug = (date: string, kind: string): string => `${date}-${kind}`;

/** What every row of the pieces table holds. */
const storedPieceBase = {
  slug: PieceSlugSchema,
  kind: PieceKindSchema,
  /** The slate's date the piece is about, `YYYY-MM-DD`. */
  date: z.iso.date(),
  headline: z.string().min(1),
  /** Paragraphs, with a blank line between them. Plain text: no markup. */
  body: z.string().min(1),
  /** When it was written, as a UTC instant. */
  writtenAt: z.iso.datetime(),
  /** The Workers AI model that wrote it. */
  model: z.string().min(1),
  /** Every piece is a model's, and says so wherever it is shown. */
  writtenBy: z.literal("model"),
};

/** A piece as a page reads it: one that passed the check. */
export const PieceSchema = z.object(storedPieceBase);
export type Piece = z.infer<typeof PieceSchema>;

/** A piece that passed the check, as D1 keeps it, with the facts it was written from. */
export const PublishedPieceSchema = z.object({
  ...storedPieceBase,
  status: z.literal("published"),
  facts: WritingFactsSchema,
});

/** A piece that failed the check, kept with the reasons so the failure can be read later. */
export const RejectedPieceSchema = z.object({
  ...storedPieceBase,
  status: z.literal("rejected"),
  reasons: z.array(z.string().min(1)).min(1),
  facts: WritingFactsSchema,
});

/** A row of the pieces table. Only a `published` one is ever read by a page. */
export const StoredPieceSchema = z.discriminatedUnion("status", [
  PublishedPieceSchema,
  RejectedPieceSchema,
]);
export type StoredPiece = z.infer<typeof StoredPieceSchema>;
