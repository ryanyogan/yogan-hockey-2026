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

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TEAM_ID = /^\d+$/;

function teamPath(teamId: string): string {
  if (!TEAM_ID.test(teamId)) throw new RangeError(`Not an ESPN team id: ${teamId}`);
  return `teams/${teamId}`;
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
};
