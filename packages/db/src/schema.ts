import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Walking-skeleton table (#31): one row per bump of the stub Agent.
 * It proves the Drizzle-to-D1 join and is replaced by `games`, `plays` and
 * `predictions`; regenerate the migrations before the first deploy.
 */
export const skeletonBumps = sqliteTable("skeleton_bumps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  count: integer("count").notNull(),
  bumpedAt: text("bumped_at").notNull(),
});
