import { createServerFn } from "@tanstack/react-start";
import {
  type StandingsTable,
  type StandingsView,
  standingsView,
  type Team,
} from "@yogan-hockey/schemas";
import { cachedStandings, cachedTeams } from "../../lib/espn";
import { NhlPageSchema } from "../../lib/nhl-page";
import { tablesByConference } from "../../lib/standings-table";
import { pageRead } from "./page-read";

/**
 * Everything `/nhl` draws: the teams, or one view of the standings as its columns of tables, with
 * the tab and view it was read for (the Teams tab keeps the view for its link back).
 */
export type NhlRead = { view: StandingsView } & (
  | { tab: "teams"; teams: Team[] }
  | { tab: "standings"; columns: StandingsTable[][] }
);

/** `/nhl`'s one read. The ESPN reads behind it are cached (`lib/espn.ts`). */
export const readNhl = createServerFn({ method: "GET" })
  .validator(NhlPageSchema)
  .handler(({ data: page }) =>
    pageRead<NhlRead>(async () => {
      const { view } = page;
      if (page.tab === "teams") return { tab: "teams", view, teams: await cachedTeams() };
      const tables = standingsView(await cachedStandings(), view);
      return { tab: "standings", view, columns: tablesByConference(tables) };
    }),
  );
