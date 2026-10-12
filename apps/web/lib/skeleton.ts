import { takeSkeletonReading } from "@yogan-hockey/espn";
import { cached, forget } from "./kv-cache";

/** The one instance of the stub Agent, and its name in the socket URL. */
export const SKELETON_AGENT_NAME = "skeleton";

const SKELETON_KEY = "skeleton-reading";
const SKELETON_TIME_LIMIT_SECONDS = 60;

/** The reading, through the site's cache on KV, with a time limit. */
export function cachedSkeletonReading() {
  return cached(SKELETON_KEY, SKELETON_TIME_LIMIT_SECONDS, takeSkeletonReading);
}

/** The next read of the reading is a fresh one. */
export function forgetSkeletonReading(): Promise<void> {
  return forget([SKELETON_KEY]);
}
