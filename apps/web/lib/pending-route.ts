/**
 * Which outline to draw the moment a link is tapped, before anything has been asked of the
 * server (#127). A navigation's answer is a round trip away, over half a second on a phone, and
 * until it is in the router shows nothing new. The outline is drawn from the address alone, so
 * the tap is answered within a frame or two; the page replaces it when it arrives.
 *
 * Pure and client-safe: `components/pending/pending-route.tsx` holds the state and draws.
 */

/** The outlines `components/pending/outlines.tsx` can draw. */
export type Outline =
  | "home"
  | "standings"
  | "live"
  | "players"
  | "player"
  | "player-games"
  | "game"
  | "game-tab"
  | "team-schedule"
  | "team-roster"
  | "team-stats";

export type PendingOutline = {
  /**
   * `page`: the whole page is replaced, under the shell. `tab`: the header of the team, game or
   * player stays (its layout does) and only the part under its tabs is replaced.
   */
  scope: "page" | "tab";
  outline: Outline;
};

type Place = {
  /** What stays when only a tab changes: `/nhl/teams/21`. Null for a page with no tabs. */
  base: string | null;
  page: Outline;
  /** The outline of this address's own tab, when it is one of several. */
  tab: Outline | null;
};

const TEAM = /^(\/nhl\/teams\/[^/]+)(?:\/(roster|stats))?$/;
const GAME = /^(\/nhl\/games\/[^/]+)(?:\/(?:scoring|pick))?$/;
const PLAYER = /^(\/players\/[^/]+)(\/games)?$/;

const PAGES: Record<string, Outline> = {
  "/": "home",
  "/nhl": "standings",
  "/nhl/live": "live",
  "/players": "players",
};

function placeOf(pathname: string): Place | null {
  const path = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  const page = PAGES[path];
  if (page) return { base: null, page, tab: null };
  const team = TEAM.exec(path);
  if (team) {
    const outline =
      team[2] === "roster" ? "team-roster" : team[2] === "stats" ? "team-stats" : "team-schedule";
    return { base: team[1] as string, page: outline, tab: outline };
  }
  const game = GAME.exec(path);
  if (game) return { base: game[1] as string, page: "game", tab: "game-tab" };
  const player = PLAYER.exec(path);
  if (player) return { base: player[1] as string, page: "player", tab: "player-games" };
  return null;
}

/**
 * The outline for a tap on a link to `href` from the page at `from` (a pathname with its query).
 * Null when nothing should be drawn: the link leads off the site, to the page already shown, to
 * a place on it, or to a page with no outline, which then arrives as it always did.
 */
export function pendingOutline(from: string, href: string): PendingOutline | null {
  if (!href.startsWith("/") || href.startsWith("//")) return null;
  const [toAddress = ""] = href.split("#");
  const [fromAddress = ""] = from.split("#");
  if (toAddress === fromAddress) return null;
  const [toPath = ""] = toAddress.split("?");
  const [fromPath = ""] = fromAddress.split("?");
  const to = placeOf(toPath);
  if (to == null) return null;
  const here = placeOf(fromPath);
  if (to.base != null && to.tab != null && here?.base === to.base && toPath !== fromPath) {
    return { scope: "tab", outline: to.tab };
  }
  return { scope: "page", outline: to.page };
}
