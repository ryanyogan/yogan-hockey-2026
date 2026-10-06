import { desc } from "drizzle-orm";
import type { Db } from "./client.ts";
import { skeletonBumps } from "./schema.ts";

export type SkeletonBump = typeof skeletonBumps.$inferSelect;
export type NewSkeletonBump = typeof skeletonBumps.$inferInsert;

export async function recordSkeletonBump(db: Db, bump: NewSkeletonBump): Promise<void> {
  await db.insert(skeletonBumps).values(bump);
}

export async function latestSkeletonBumps(db: Db, limit: number): Promise<SkeletonBump[]> {
  return db.select().from(skeletonBumps).orderBy(desc(skeletonBumps.id)).limit(limit);
}
