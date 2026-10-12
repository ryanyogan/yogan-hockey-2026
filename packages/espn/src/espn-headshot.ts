import { z } from "zod";

/**
 * An athlete's headshot, read as its URL. The team response sends the URL itself since
 * 2026-10-12, and sent `{ href }` before, as the athlete and search responses still do.
 */
export const espnHeadshot = z
  .union([z.string(), z.object({ href: z.string() }).transform((image) => image.href)])
  .nullish();
