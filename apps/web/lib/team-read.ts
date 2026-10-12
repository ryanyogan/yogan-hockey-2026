import {
  divisionPlace,
  type RosterPlayer,
  type Standings,
  type TeamDetail,
} from "@yogan-hockey/schemas";
import { cachedStandings, cachedTeamSchedule } from "./espn";
import { findTeam } from "./find-team";
import { pageNotFound } from "./page-not-found";
import { sortRoster } from "./roster";
import { readSlatePicks } from "./slate-picks";
import type { TeamStanding } from "./team-page";
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
export type TeamRead = Pick<TeamDetail, "team" | "stats" | "nextGame"> & {
  /**
   * The team's conference and division and its place in the division, from the standings; null
   * when they do not list the team or could not be read. ESPN's own `standingSummary` comes with
   * the team and is left out: it has been wrong for every team since 2026-10-12 (#209).
   */
  standing: TeamStanding | null;
  /** Today's slate's picks in one line each, by game id: the banner's and the card's. */
  picks: Record<string, string>;
};

/** The team behind `/nhl/teams/:id`. A team that does not exist is the page's 404. */
async function team(id: string): Promise<TeamDetail> {
  return (await findTeam(id)) ?? pageNotFound();
}

/** Where the standings have a team, or null when they do not list it. */
function teamStanding(standings: Standings, id: string): TeamStanding | null {
  const place = divisionPlace(standings, id);
  if (place == null) return null;
  const { row, rank } = place;
  return { conference: row.conference, division: row.division, divisionRank: rank };
}

/** The parent route's read: the team, where it plays, and the slate's picks. */
export async function readTeam(id: string): Promise<TeamRead> {
  // Started with the others and asked last: neither of them fails, so a team that cannot be read
  // is reported once both have finished and nothing is left reading behind the answer.
  const found = team(id);
  found.catch(() => {});
  const [standings, { picks }] = await Promise.all([
    // The header can do without its conference, its division and its place.
    cachedStandings().catch((error: unknown) => {
      console.error("Team: the standings could not be read", error);
      return null;
    }),
    // An extra: it answers no picks when they cannot be read.
    readSlatePicks(),
  ]);
  const detail = await found;
  return {
    team: detail.team,
    stats: detail.stats,
    nextGame: detail.nextGame,
    standing: standings == null ? null : teamStanding(standings, id),
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
