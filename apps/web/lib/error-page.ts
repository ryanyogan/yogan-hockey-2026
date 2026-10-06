import { nhlHref } from "./nhl-page";

/** What the error page says about the page that could not be drawn, and its way back. */
export type UnreadPage = {
  /** The section's title: "Team". */
  title: string;
  /** As the sentence names it: "this team". */
  subject: string;
  /** Where to go instead; the label ends "or go to ...". */
  back: { href: string; label: string };
};

const TONIGHT = { href: "/", label: "tonight" };
const LIVE_SCORES = { href: "/nhl/live", label: "live scores" };

const below = (pathname: string, root: string) => pathname.startsWith(`${root}/`);

/**
 * The error page's words for a path. A page with an id leads back to the list it came from, as
 * its not-found page does; anything else leads to tonight. Client-safe: `app/error.tsx` calls it.
 */
export function unreadPage(pathname: string): UnreadPage {
  if (below(pathname, "/nhl/teams")) {
    return {
      title: "Team",
      subject: "this team",
      back: { href: nhlHref({ tab: "teams", view: "division" }), label: "all teams" },
    };
  }
  if (below(pathname, "/players")) {
    return {
      title: "Player",
      subject: "this player",
      back: { href: "/players", label: "all players" },
    };
  }
  if (below(pathname, "/nhl/games")) {
    return { title: "Game", subject: "this game", back: LIVE_SCORES };
  }
  if (pathname === "/nhl") {
    return { title: "NHL", subject: "the standings and teams", back: TONIGHT };
  }
  // The dashboard is tonight: its way on is the scores, which come from the socket, not this read.
  return { title: "Page", subject: "this page", back: pathname === "/" ? LIVE_SCORES : TONIGHT };
}
