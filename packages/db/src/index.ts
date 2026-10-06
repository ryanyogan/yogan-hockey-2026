import { desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema.ts";

export type Db = ReturnType<typeof createDb>;
export type SkeletonBump = typeof schema.skeletonBumps.$inferSelect;
export type NewSkeletonBump = typeof schema.skeletonBumps.$inferInsert;

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export async function recordSkeletonBump(db: Db, bump: NewSkeletonBump): Promise<void> {
  await db.insert(schema.skeletonBumps).values(bump);
}

export async function latestSkeletonBumps(db: Db, limit: number): Promise<SkeletonBump[]> {
  return db.select().from(schema.skeletonBumps).orderBy(desc(schema.skeletonBumps.id)).limit(limit);
}
