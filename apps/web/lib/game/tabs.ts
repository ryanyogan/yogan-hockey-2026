/** The tabs under the rink, in order. The first is the one a game page opens on. */
export const GAME_TABS = [
  { value: "plays", label: "plays" },
  { value: "scoring", label: "scoring" },
  { value: "pick", label: "the pick" },
] as const;

export type GameTab = (typeof GAME_TABS)[number]["value"];

/** The tab a `?tab=` names; the plays for anything else. */
export function gameTabFrom(value: string | string[] | undefined): GameTab {
  return GAME_TABS.find((tab) => tab.value === value)?.value ?? "plays";
}

/** The tabs as links for `UrlTabs`, on the page at `pathname`. */
export function gameTabLinks(pathname: string) {
  return GAME_TABS.map((tab) => ({
    ...tab,
    href: tab.value === "plays" ? pathname : `${pathname}?tab=${tab.value}`,
  }));
}
