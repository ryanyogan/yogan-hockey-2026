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

/**
 * The tab a game shows: a game with no pick has no "the pick" tab, and an address that names it
 * shows the plays.
 */
export function shownGameTab(tab: GameTab, hasPick: boolean): GameTab {
  return tab === "pick" && !hasPick ? "plays" : tab;
}

/** The tabs as links for `UrlTabs`, on the page at `pathname`: "the pick" only when there is one. */
export function gameTabLinks(pathname: string, hasPick = true) {
  return GAME_TABS.filter((tab) => hasPick || tab.value !== "pick").map((tab) => ({
    ...tab,
    href: tab.value === "plays" ? pathname : `${pathname}/${tab.value}`,
  }));
}

/** The nested route changes only the tab; the game's route above it keeps the game and replay. */
export function gameTabOfPath(pathname: string): GameTab {
  return gameTabFrom(pathname.split("/").filter(Boolean)[3]);
}
