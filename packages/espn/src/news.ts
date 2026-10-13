import { NEWS_LIMIT, type News, NewsItemSchema, NewsSchema } from "@yogan-hockey/schemas";
import { z } from "zod";
import { endpoints } from "./endpoints.ts";
import { translateResponse } from "./translate.ts";

/** A link as its address. ESPN sends `{ href }`; it has turned such a thing into the text itself before. */
const espnLink = z.union([
  z.string(),
  z.object({ href: z.string() }).transform((link) => link.href),
]);

/** ESPN sends a recap's and a preview's address as http. Its site answers on https. */
function secure(address: string): string {
  return address.replace(/^http:\/\//i, "https://");
}

const instant = z.iso.datetime();
const instantWithOffset = z.iso.datetime({ offset: true });

/** When ESPN published an article as a UTC instant, or null when it did not say in a way read here. */
function publishedAt(published: unknown): string | null {
  if (instant.safeParse(published).success) return published as string;
  return instantWithOffset.safeParse(published).success
    ? new Date(published as string).toISOString()
    : null;
}

/**
 * One article of ESPN's news, read for the four things the site prints or follows. The rest of
 * what ESPN sends (images, categories, a description, a byline, other links) is not read, so it
 * can change or go without the site noticing.
 */
const EspnArticle = z.object({
  id: z.union([z.string().min(1), z.number()]).transform(String),
  // "HeadlineNews", "Story", "Recap", "Preview", "Media". Not on every article ESPN may send.
  type: z.string().nullish(),
  headline: z.string().trim().min(1),
  published: z.unknown().optional(),
  links: z.object({ web: espnLink.transform(secure).pipe(NewsItemSchema.shape.url) }),
});

/** A video: highlights or a clip, which is watched on ESPN and is not a headline to read. */
const VIDEO = "Media";

const EspnNews = z.object({ articles: z.array(z.unknown()) });
/** Every article read strictly, for the error that says where when none can be read. */
const EspnNewsStrict = z.object({ articles: z.array(EspnArticle) });

/**
 * Translates ESPN's news response into the headlines Home lists: ESPN's order, videos left out,
 * no article twice, `NEWS_LIMIT` at most.
 *
 * An article that cannot be read is left out and the rest are kept: the list is ESPN's editors'
 * mix of kinds of article, and one of a new kind should not cost Home the others. When ESPN sent
 * articles and not one can be read, the shape has changed, and that is an `EspnParseError` naming
 * the first field that is wrong.
 */
export function translateNews(json: unknown): News {
  return translateResponse(endpoints.news(), json, EspnNews, NewsSchema, ({ articles }) => {
    const read = articles.flatMap((article) => {
      const parsed = EspnArticle.safeParse(article);
      return parsed.success ? [parsed.data] : [];
    });
    // Throws a ZodError whose paths are counted from the top of ESPN's response.
    if (articles.length > 0 && read.length === 0) EspnNewsStrict.parse(json);
    const listed = new Set<string>();
    return read
      .filter(({ id, type }) => type !== VIDEO && !listed.has(id) && listed.add(id))
      .slice(0, NEWS_LIMIT)
      .map(({ id, headline, published, links }) => ({
        id,
        headline,
        url: links.web,
        published: publishedAt(published),
      }));
  });
}
