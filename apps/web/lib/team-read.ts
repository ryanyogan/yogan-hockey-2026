import type { RosterPlayer, StandingsRow, TeamDetail } from "@yogan-hockey/schemas";
import { cachedStandings, cachedTeamSchedule } from "./espn";
import { findTeam } from "./find-team";
import { pageNotFound } from "./page-not-found";
import { sortRoster } from "./roster";
import { readSlatePicks } from "./slate-picks";
import { type ScheduleView, scheduleView } from "./team-schedule";

/*
 * What each route of a team's page reads, on the server (`src/functions/team.ts` has the server
 * function for each). The header's read is the parent route's and each tab's is its own, so
 * changing tab asks for the tab and nothing else.
 *
 * Every one of them answers "not found" for an id that is no team's, since each can be the first
 * asked: a tab's read runs beside the header's, and a failure of it would otherwise be reported
 * as the page's (`lib/render-failure.ts`) where the page is a 404.
 */

/**
 * What the header, the "Playing now" banner and the Next Game card are drawn from. The roster and
 * the split records come with the team from ESPN and are left out: they are their tabs' to send.
 */
export type TeamRead = Pick<TeamDetail, "team" | "stats" | "standingSummary" | "nextGame"> & {
  /** The team's conference and division, or null when the standings could not be read. */
  standing: Pick<StandingsRow, "conference" | "division"> | null;
  /** Today's slate's picks in one line each, by game id: the banner's and the card's. */
  picks: Record<string, string>;
};

/** The team behind `/nhl/teams/:id`. A team that does not exist is the page's 404. */
async function team(id: string): Promise<TeamDetail> {
  return (await findTeam(id)) ?? pageNotFound();
}

/** The parent route's read: the team, where it plays, and the slate's picks. */
export async function readTeam(id: string): Promise<TeamRead> {
  const [detail, standings, { picks }] = await Promise.all([
    team(id),
    // The header can do without its conference and division.
    cachedStandings().catch((error: unknown) => {
      console.error("Team: the standings could not be read", error);
      return null;
    }),
    // An extra: it answers no picks when they cannot be read.
    readSlatePicks(),
  ]);
  const row = standings?.rows.find((standing) => standing.team.id === id);
  return {
    team: detail.team,
    stats: detail.stats,
    standingSummary: detail.standingSummary,
    nextGame: detail.nextGame,
    standing: row == null ? null : { conference: row.conference, division: row.division },
    picks,
  };
}

/** The Schedule tab's read: the games to come, the postponed and the results. */
export async function readTeamSchedule(id: string): Promise<ScheduleView> {
  // Started before the team is known to exist, so the two reads run side by side. A team that
  // does not exist has no schedule either: that failure is heard here and never reported.
  const schedule = cachedTeamSchedule(id);
  schedule.catch(() => {});
  await team(id);
  return scheduleView(await schedule);
}

/** The Roster tab's read: the team's players in jersey order. */
export async function readTeamRoster(id: string): Promise<RosterPlayer[]> {
  return sortRoster((await team(id)).roster);
}

/** The Stats tab's read: the season's figures, and the record at home and on the road. */
export async function readTeamStats(id: string): Promise<Pick<TeamDetail, "stats" | "record">> {
  const { stats, record } = await team(id);
  return { stats, record };
}
