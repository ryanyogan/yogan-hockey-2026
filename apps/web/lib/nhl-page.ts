import { type StandingsView, StandingsViewSchema } from "@yogan-hockey/schemas";
import { z } from "zod";

/** The two tabs of `/nhl`. The value is what the URL holds in `?tab=`. */
export const NHL_TABS = ["standings", "teams"] as const;
export type NhlTab = (typeof NHL_TABS)[number];

/** The standings views in the order their tabs are drawn. The value is what `?view=` holds. */
export const STANDINGS_VIEWS = StandingsViewSchema.options;

/** What `/nhl` shows: a tab, and the view of the standings (which the Teams tab ignores). */
export type NhlPage = { tab: NhlTab; view: StandingsView };

/** `NhlPage` as it arrives from outside: what the page's server function accepts. */
export const NhlPageSchema = z.object({ tab: z.enum(NHL_TABS), view: StandingsViewSchema });

const DEFAULT_PAGE: NhlPage = { tab: "standings", view: "division" };

/** A page's query string, read: a parameter given twice arrives as a list. */
export type Query = Record<string, unknown>;

/** The first value of a parameter, which arrives as a list when the URL gives it twice. */
export const first = (value: unknown): unknown => (Array.isArray(value) ? value[0] : value);

/** Reads `/nhl`'s tab and view from its query string. Anything unknown falls back to the default. */
export function readNhlPage(query: Query): NhlPage {
  const tab = NHL_TABS.find((candidate) => candidate === first(query.tab));
  const view = StandingsViewSchema.safeParse(first(query.view));
  return {
    tab: tab ?? DEFAULT_PAGE.tab,
    view: view.success ? view.data : DEFAULT_PAGE.view,
  };
}

/** The URL of a tab and view of `/nhl`, with the defaults left out so each has one address. */
export function nhlHref({ tab, view }: NhlPage): string {
  if (tab === "teams") return "/nhl?tab=teams";
  return view === DEFAULT_PAGE.view ? "/nhl" : `/nhl?view=${view}`;
}
