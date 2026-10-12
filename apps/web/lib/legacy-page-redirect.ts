import { TEAM_TABS, teamPageHref } from "./team-page";

/**
 * Where an address from before a tab was a page of its own now lives, or null for any other.
 *
 * Until #94 a team's tab was `?tab=roster`, and a game's `?tab=scoring` and a player's
 * `?games=all` were the same. Those addresses are out in the world, so the Worker's entry sends
 * each to its new one for good (308) before anything is rendered. `?tab=schedule`, and a `?tab=`
 * that names no tab, are left alone and show the default tab, as they always did.
 */
export function legacyPageLocation(url: URL): string | null {
  const path = url.pathname;
  // A team's old tab link keeps its whole query, `tab` included, as it always has: the tab's own
  // page ignores it.
  const team = /^\/nhl\/teams\/([^/]+)$/.exec(path);
  if (team?.[1] != null) {
    const tabs = url.searchParams.getAll("tab");
    const tab = TEAM_TABS.find((candidate) => candidate === tabs[0]);
    if (tabs.length !== 1 || tab == null || teamPageHref(team[1], tab) === path) return null;
    const target = new URL(url);
    target.pathname = teamPageHref(team[1], tab);
    return target.href;
  }
  const selector = /^\/nhl\/games\/[^/]+$/.test(path)
    ? { key: "tab", values: ["scoring", "pick"] }
    : /^\/players\/[^/]+$/.test(path)
      ? { key: "games", values: ["all"] }
      : null;
  if (!selector) return null;
  const values = url.searchParams.getAll(selector.key);
  if (values.length !== 1 || !selector.values.includes(values[0] ?? "")) return null;
  const target = new URL(url);
  target.pathname = `${path}/${selector.key === "games" ? "games" : values[0]}`;
  target.searchParams.delete(selector.key);
  return target.href;
}
