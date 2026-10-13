import type { News } from "@yogan-hockey/schemas";
import { gameDay, gameTime } from "../../lib/game-time";
import { useZone } from "../story/story-parts";
import { link, sectionHead, sectionKicker, sectionTitle } from "./front";

/** The latest first. An item ESPN gave no time comes last, in the order it was sent. */
export function newestFirst(news: News): News {
  const at = (published: string | null) => (published == null ? -Infinity : Date.parse(published));
  return news.toSorted((a, b) => at(b.published) - at(a.published));
}

/**
 * ESPN's NHL headlines (#217) as the front page's column of them (#240): the latest first, each
 * a row over a hairline with when it was published in a narrow column of agate and the headline
 * in the serif beside it. The day is said once, beside the title, and is the latest item's; an
 * item of another day says its day where the rest say their time. Each row is one link to the
 * item's page on ESPN, 64px tall at the least.
 *
 * A time is the visitor's own once the page has hydrated and Eastern, marked so, before
 * (`useZone`, as `LocalTime`).
 *
 * With no news (`null`: ESPN's could not be read, or it had none) nothing is drawn at all.
 */
export function HomeNews({ news }: { news: News | null }) {
  const [timeZone, mark] = useZone();
  if (news == null || news.length === 0) return null;
  const sorted = newestFirst(news);
  const day = sorted[0]?.published == null ? null : gameDay(sorted[0].published, timeZone);
  return (
    <section aria-labelledby="news-heading" data-slot="news">
      <div className={`${sectionHead} flex-wrap gap-y-1`}>
        <h2 id="news-heading" className={sectionTitle}>
          Headlines
        </h2>
        <p data-slot="news-from" className={sectionKicker}>
          From ESPN
          {day != null && ` · ${day}${mark && `,${mark}`}`}
        </p>
      </div>
      <ul>
        {sorted.map(({ id, headline, url, published }) => {
          const itsDay = published == null ? null : gameDay(published, timeZone);
          return (
            <li key={id} data-slot="news-item" className="border-hairline border-b">
              <a
                href={url}
                className={`${link} group grid min-h-16 grid-cols-[72px_minmax(0,1fr)] items-baseline gap-4 py-[14px]`}
              >
                <span
                  data-slot="news-when"
                  className="font-agate text-[13px] text-muted-foreground"
                >
                  {published != null && (
                    <time dateTime={published}>
                      {itsDay === day ? gameTime(published, timeZone) : itsDay}
                    </time>
                  )}
                </span>
                <span
                  data-slot="news-headline"
                  className="font-medium text-[19px] leading-[1.3] group-hover:text-kicker"
                >
                  {headline}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
