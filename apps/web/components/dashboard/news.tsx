import type { News } from "@yogan-hockey/schemas";
import { LocalTime } from "../local-time";
import { link, ruledLabel } from "./agate";

/**
 * ESPN's NHL headlines (#217), under the briefs and in their form: a red label over a plain rule
 * and rows parted by dotted rules, three columns at a desk and one on a phone. A headline reads,
 * so it is the serif; when it was published is looked up, so it is agate. Each row is one link
 * to the article on ESPN, as tall as the row, which is more than a thumb's 44px.
 *
 * With no news (`null`: ESPN's could not be read, or it had none) nothing is drawn at all, no
 * label and no gap, and the lower band follows the briefs as it did before there was news.
 */
export function HomeNews({ news }: { news: News | null }) {
  if (news == null || news.length === 0) return null;
  return (
    <section aria-labelledby="news-heading" data-slot="news" className="mt-8 md:mt-11">
      <h2 id="news-heading" className={ruledLabel}>
        Headlines from ESPN
      </h2>
      {/* A column is 340px or the whole row, whichever is less: a 360px phone's row is 328px. */}
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(340px,100%),1fr))] gap-x-7 md:gap-x-8">
        {news.map(({ id, headline, url, published }) => (
          <li key={id} data-slot="news-item" className="border-border border-b border-dotted">
            <a href={url} className={`${link} group block pt-[10px] pb-[9px]`}>
              <span
                data-slot="news-headline"
                className="block font-serif font-strong text-[18px] normal-nums leading-[1.25] tracking-[-0.005em] group-hover:underline"
              >
                {headline}
              </span>
              {published != null && (
                <span data-slot="news-when" className="mt-[3px] block text-[13px] text-aside">
                  <LocalTime at={published} show="day" /> · <LocalTime at={published} show="time" />
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
