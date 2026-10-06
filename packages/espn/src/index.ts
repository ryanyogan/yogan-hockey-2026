import { type Reading, ReadingSchema } from "@yogan-hockey/schemas";

/**
 * Walking-skeleton stand-in for an ESPN fetch (#31): every call produces a new
 * reading, so a page showing the same reading twice proves it came from the
 * cache. Replaced by the real client.
 */
export async function takeSkeletonReading(): Promise<Reading> {
  return ReadingSchema.parse({
    serial: crypto.randomUUID(),
    takenAt: new Date().toISOString(),
  });
}
