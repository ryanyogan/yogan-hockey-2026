import { z } from "zod";

/** The most news items Home lists. ESPN is asked for more, since some are not for the list. */
export const NEWS_LIMIT = 6;

/** Whether an address is a page of ESPN's own site, over HTTPS: the only place a news item leads. */
function isEspnPage(address: string): boolean {
  if (!URL.canParse(address)) return false;
  const { protocol, hostname } = new URL(address);
  return protocol === "https:" && (hostname === "espn.com" || hostname.endsWith(".espn.com"));
}

/** A News item: one of ESPN's NHL headlines, with the page of ESPN's it leads to. */
export const NewsItemSchema = z.object({
  /** ESPN's id for it. */
  id: z.string().min(1),
  headline: z.string().min(1),
  /** Its page on ESPN's site. Never anywhere else. */
  url: z.string().refine(isEspnPage, "Not an https address on espn.com"),
  /** When ESPN published it, as a UTC instant, or null when it did not say. */
  published: z.iso.datetime().nullable(),
});
export type NewsItem = z.infer<typeof NewsItemSchema>;

/** The News: the league's News items as Home lists them, in ESPN's order, `NEWS_LIMIT` at most. */
export const NewsSchema = z.array(NewsItemSchema).max(NEWS_LIMIT);
export type News = z.infer<typeof NewsSchema>;
