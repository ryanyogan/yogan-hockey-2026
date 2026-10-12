import { createServerFn } from "@tanstack/react-start";
import { TeamSchema } from "@yogan-hockey/schemas";
import { readTeam, readTeamRoster, readTeamSchedule, readTeamStats } from "../../lib/team-read";
import { pageRead } from "./page-read";

/**
 * The reads of a team's pages (`lib/team-read.ts`), one for each route: the parent's, which the
 * header, the banner and the Next Game card are drawn from, and one for each tab. The ESPN reads
 * behind them are cached (`lib/espn.ts`).
 *
 * Each takes the `:id` of `/nhl/teams/:id` as the address has it. An id that could be no team's
 * is not refused here: it is the page's 404, which the read answers.
 */
const TeamIdSchema = TeamSchema.pick({ id: true });

/** `/nhl/teams/:id`'s own read, shared by its tabs and made once for all of them. */
export const readTeamPage = createServerFn({ method: "GET" })
  .validator(TeamIdSchema)
  .handler(({ data }) => pageRead(() => readTeam(data.id)));

/** The Schedule tab's read. */
export const readTeamSchedulePage = createServerFn({ method: "GET" })
  .validator(TeamIdSchema)
  .handler(({ data }) => pageRead(() => readTeamSchedule(data.id)));

/** The Roster tab's read. */
export const readTeamRosterPage = createServerFn({ method: "GET" })
  .validator(TeamIdSchema)
  .handler(({ data }) => pageRead(() => readTeamRoster(data.id)));

/** The Stats tab's read. */
export const readTeamStatsPage = createServerFn({ method: "GET" })
  .validator(TeamIdSchema)
  .handler(({ data }) => pageRead(() => readTeamStats(data.id)));
