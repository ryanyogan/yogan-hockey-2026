import { PLAYER_SEARCH_LIMIT } from "@yogan-hockey/schemas";

/** One ESPN request: where it goes, what errors call it, and which recorded response stands in for it. */
export type Endpoint = {
  /** Names the endpoint in errors and alerts, e.g. `teams/21/schedule`. */
  name: string;
  url: string;
  /** The recorded response's file name in `fixtures/`, without `.json`. */
  fixture: string;
};

const SITE = "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl";
// Standings live on a different path from everything else. `level=3` nests conference, then
// division, which is enough to build all four standings views from one response.
const STANDINGS = "https://site.api.espn.com/apis/v2/sports/hockey/nhl/standings?level=3";

// Athletes and search are on ESPN's "common" API. The athlete's stats and game log answer only
// on the `site.web` host.
const ATHLETES = "https://site.api.espn.com/apis/common/v3/sports/hockey/nhl/athletes";
const ATHLETES_WEB = "https://site.web.api.espn.com/apis/common/v3/sports/hockey/nhl/athletes";
const SEARCH = "https://site.api.espn.com/apis/common/v3/search";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ESPN_ID = /^\d+$/;

function teamPath(teamId: string): string {
  if (!ESPN_ID.test(teamId)) throw new RangeError(`Not an ESPN team id: ${teamId}`);
  return `teams/${teamId}`;
}

function athletePath(athleteId: string): string {
  if (!ESPN_ID.test(athleteId)) throw new RangeError(`Not an ESPN athlete id: ${athleteId}`);
  return `athletes/${athleteId}`;
}

export const endpoints = {
  /** ESPN's current slate, or the slate of one `YYYY-MM-DD` date. */
  scoreboard(date?: string): Endpoint {
    if (date === undefined) {
      return { name: "scoreboard", url: `${SITE}/scoreboard`, fixture: "scoreboard" };
    }
    if (!ISO_DATE.test(date)) throw new RangeError(`Not a YYYY-MM-DD date: ${date}`);
    const dates = date.replaceAll("-", "");
    return {
      name: `scoreboard?dates=${dates}`,
      url: `${SITE}/scoreboard?dates=${dates}`,
      fixture: `scoreboard-${dates}`,
    };
  },
  standings(): Endpoint {
    return { name: "standings", url: STANDINGS, fixture: "standings" };
  },
  teams(): Endpoint {
    return { name: "teams", url: `${SITE}/teams`, fixture: "teams" };
  },
  /** Team detail: record, roster and next game in one response. */
  team(teamId: string): Endpoint {
    const path = teamPath(teamId);
    return { name: path, url: `${SITE}/${path}?enable=roster,stats`, fixture: `team-${teamId}` };
  },
  /** The regular season, asked for by name: left to itself ESPN follows the calendar. */
  teamSchedule(teamId: string): Endpoint {
    const path = `${teamPath(teamId)}/schedule`;
    return { name: path, url: `${SITE}/${path}?seasontype=2`, fixture: `team-${teamId}-schedule` };
  },
  /** The whole-game snapshot: header, every play so far, and what a Prediction is made from. */
  summary(gameId: string): Endpoint {
    if (!ESPN_ID.test(gameId)) throw new RangeError(`Not an ESPN event id: ${gameId}`);
    return {
      name: `summary?event=${gameId}`,
      url: `${SITE}/summary?event=${gameId}`,
      fixture: `summary-${gameId}`,
    };
  },
  /** An athlete's profile and the headline stats of his season. */
  player(athleteId: string): Endpoint {
    const path = athletePath(athleteId);
    return { name: path, url: `${ATHLETES}/${athleteId}`, fixture: `athlete-${athleteId}` };
  },
  /** An athlete's regular seasons, one row each, with career totals. */
  playerCareer(athleteId: string): Endpoint {
    const path = `${athletePath(athleteId)}/stats`;
    return {
      name: path,
      url: `${ATHLETES_WEB}/${athleteId}/stats`,
      fixture: `athlete-${athleteId}-stats`,
    };
  },
  /** An athlete's games this season. */
  playerGameLog(athleteId: string): Endpoint {
    const path = `${athletePath(athleteId)}/gamelog`;
    return {
      name: path,
      url: `${ATHLETES_WEB}/${athleteId}/gamelog`,
      fixture: `athlete-${athleteId}-gamelog`,
    };
  },
  /** NHL players whose names match. The recorded response is named for the query: `search-mar`. */
  playerSearch(query: string): Endpoint {
    const params = new URLSearchParams({
      query,
      type: "player",
      sport: "hockey",
      league: "nhl",
      limit: String(PLAYER_SEARCH_LIMIT),
    });
    const slug = query
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return { name: "search", url: `${SEARCH}?${params}`, fixture: `search-${slug}` };
  },
};
