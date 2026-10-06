import { takeSkeletonReading } from "@yogan-hockey/espn";
import { unstable_cache } from "next/cache";

/** The one instance of the stub Agent, and its name in the socket URL. */
export const SKELETON_AGENT_NAME = "skeleton";

export const SKELETON_TAG = "skeleton";
const SKELETON_TIME_LIMIT_SECONDS = 60;

/** The reading, through vinext's data cache on KV, with a tag and a time limit. */
export const cachedSkeletonReading = unstable_cache(takeSkeletonReading, ["skeleton-reading"], {
  tags: [SKELETON_TAG],
  revalidate: SKELETON_TIME_LIMIT_SECONDS,
});
