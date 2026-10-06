import { z } from "zod";
import { GameHeaderSchema } from "./game-summary.ts";
import { type Play, PlaySchema } from "./play.ts";

/**
 * The Game Agent's synced state: the header and two flags, and no plays. It is sent whole on
 * every change, which is why the plays travel as `GameStreamMessage`s instead.
 */
export const GameStreamStateSchema = z.object({
  /** Score, shots, period, clock and status, as ESPN last gave them. Null until the first poll. */
  header: GameHeaderSchema.nullable(),
  /** Three polls in a row have failed: the page shows "Updates delayed" over the last state. */
  delayed: z.boolean(),
  /**
   * The finished game and its plays are in D1, which is when its page can become the Replay.
   * `header.status` turns `final` first, at the last poll; this follows once the write is done.
   */
  archived: z.boolean(),
});
export type GameStreamState = z.infer<typeof GameStreamStateSchema>;

/**
 * What the Game Agent sends a viewer about plays, apart from its synced state.
 *
 * - `plays`: every play so far, in order. Sent on connect, and in place of a long run of the
 *   other three when a poll finds many differences at once.
 * - `play-added`: a new play, and where in the list it goes.
 * - `play-changed`: ESPN revised a play, or moved it; `index` is where it sits now.
 * - `play-removed`: ESPN took a play back.
 *
 * A viewer applies them in the order they arrive, with `applyGameStreamMessage`.
 */
export const GameStreamMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("plays"), plays: z.array(PlaySchema) }),
  z.object({
    type: z.literal("play-added"),
    index: z.number().int().nonnegative(),
    play: PlaySchema,
  }),
  z.object({
    type: z.literal("play-changed"),
    index: z.number().int().nonnegative(),
    play: PlaySchema,
  }),
  z.object({ type: z.literal("play-removed"), id: z.string().min(1) }),
]);
export type GameStreamMessage = z.infer<typeof GameStreamMessageSchema>;

/** What the Game Agent answers a server component with for first paint. */
export const GameSnapshotSchema = GameStreamStateSchema.extend({
  /** Every play so far, in order. */
  plays: z.array(PlaySchema),
  /** ESPN has no game of this id: the page is the not-found page. */
  notFound: z.boolean(),
});
export type GameSnapshot = z.infer<typeof GameSnapshotSchema>;

/**
 * A message from the Game Agent's socket as a `GameStreamMessage`, or null when it is something
 * else: the socket also carries the Agents SDK's own messages (`cf_agent_state` and the like).
 */
export function parseGameStreamMessage(data: unknown): GameStreamMessage | null {
  if (typeof data !== "string") return null;
  let json: unknown;
  try {
    json = JSON.parse(data);
  } catch {
    return null;
  }
  const parsed = GameStreamMessageSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

function insertAt(plays: Play[], index: number, play: Play): Play[] {
  const without = plays.filter((existing) => existing.id !== play.id);
  return [...without.slice(0, index), play, ...without.slice(index)];
}

/**
 * A viewer's plays after one message: the reducer a game page keeps its play list with. It
 * returns a new list, and a message that arrives twice changes nothing the second time.
 */
export function applyGameStreamMessage(plays: Play[], message: GameStreamMessage): Play[] {
  switch (message.type) {
    case "plays":
      return message.plays;
    case "play-added":
    case "play-changed":
      return insertAt(plays, message.index, message.play);
    case "play-removed":
      return plays.filter((play) => play.id !== message.id);
  }
}

function samePlay(a: Play, b: Play): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * The messages that turn `before` into `after`, ESPN's list as one poll and then the next gave
 * it (spec section 4). Plays are matched by ESPN's play id and their order is the list's: a play
 * gone from the list is a removal, a new id an addition, and a play that reads differently or
 * sits somewhere else a change. Applied in order, the messages end at `after` exactly.
 */
export function diffPlays(before: Play[], after: Play[]): GameStreamMessage[] {
  const kept = new Set(after.map((play) => play.id));
  const messages: GameStreamMessage[] = before
    .filter((play) => !kept.has(play.id))
    .map((play) => ({ type: "play-removed", id: play.id }));

  // The viewer's list as it stands while the messages so far are applied.
  let current = before.filter((play) => kept.has(play.id));
  const known = new Map(current.map((play) => [play.id, play]));
  after.forEach((play, index) => {
    const was = known.get(play.id);
    const inPlace = current[index]?.id === play.id;
    if (was && inPlace && samePlay(was, play)) return;
    messages.push({ type: was ? "play-changed" : "play-added", index, play });
    current = insertAt(current, index, play);
  });
  return messages;
}
