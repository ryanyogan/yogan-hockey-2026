import { z } from "zod";

/** A player named on a play. */
export const PlayParticipantSchema = z.object({
  /** ESPN's athlete id. */
  athleteId: z.string().min(1),
  name: z.string().min(1),
  shortName: z.string().min(1),
  /** ESPN's role on the play ("scorer", "assister", "shooter", "saver"); it omits some. */
  role: z.string().nullable(),
});
export type PlayParticipant = z.infer<typeof PlayParticipantSchema>;

/** Where a play happened, in feet from centre ice, as ESPN gives it. */
export const PlayCoordinateSchema = z.object({ x: z.number(), y: z.number() });
export type PlayCoordinate = z.infer<typeof PlayCoordinateSchema>;

/**
 * One play of a game, in the form a Game Stream sends and a Replay redraws.
 * Its place in the game is its position in the list, never a field of its own.
 */
export const PlaySchema = z.object({
  /** ESPN's play id, unique within the game. */
  id: z.string().min(1),
  /** ESPN's type abbreviation: "goal", "shot-on-goal", "period-start", "faceoff". */
  type: z.string().min(1),
  /** The type as shown: "Goal", "Shot", "High-sticking". */
  typeText: z.string(),
  /** 1 to 3 in regulation, 4 and up for overtime and the shootout. */
  period: z.number().int().positive(),
  /** The period as shown: "1st", "OT", "SO". */
  periodText: z.string(),
  /** The game clock as ESPN shows it, "12:34". */
  clock: z.string(),
  text: z.string(),
  /** ESPN's id for the team the play belongs to; period starts and stoppages have none. */
  teamId: z.string().min(1).nullable(),
  /** ESPN gives one on about 93% of plays. */
  coordinate: PlayCoordinateSchema.nullable(),
  /**
   * The play is a goal. A shootout goal is one too, though it leaves the running score where it
   * was: the shootout's plays have `periodText` "SO".
   */
  scoring: z.boolean(),
  /** The play is a penalty. ESPN has one type per infraction, so the type alone does not say. */
  penalty: z.boolean(),
  /** The score once the play has happened. */
  homeScore: z.number().int().nonnegative(),
  awayScore: z.number().int().nonnegative(),
  /** ESPN's strength abbreviation: "even-strength", "power-play", "short-handed". */
  strength: z.string().nullable(),
  /** When the play happened, as a UTC instant. */
  wallclock: z.iso.datetime().nullable(),
  participants: z.array(PlayParticipantSchema),
});
export type Play = z.infer<typeof PlaySchema>;

const KEY_PLAY_TYPES = new Set(["goal", "shot-on-goal", "period-start", "period-end"]);

/**
 * Whether a play is a Key play: a goal, a penalty, a shot on goal, or the start or end of a
 * period. A game page shows these first. It is worked out from the play, never stored.
 */
export function isKeyPlay(play: Play): boolean {
  return play.scoring || play.penalty || KEY_PLAY_TYPES.has(play.type);
}
