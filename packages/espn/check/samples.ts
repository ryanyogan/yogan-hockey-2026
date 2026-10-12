/**
 * The requests that stand for every ESPN read the site makes. The fixture recorder
 * (`scripts/record-fixtures.ts`) records them and the daily live check (`live-check.ts`) fetches
 * and parses them, so the two cannot drift apart.
 *
 * `READS` has one entry for each builder in `endpoints`, by type: a read added to `endpoints`
 * fails typecheck here until it is given its translation and at least one sample, and that is
 * what puts it in the recorder and in the check.
 */
import type { Game } from "@yogan-hockey/schemas";
import { type Endpoint, endpoints } from "../src/endpoints.ts";
import {
  translatePlayer,
  translatePlayerCareer,
  translatePlayerGameLog,
  translatePlayerSearch,
} from "../src/player.ts";
import { translateScoreboard } from "../src/scoreboard.ts";
import { translateStandings } from "../src/standings.ts";
import { translateGameSummary } from "../src/summary.ts";
import { translateTeam, translateTeamSchedule, translateTeams } from "../src/team.ts";

type Read = keyof typeof endpoints;
type Args<K extends Read> = Parameters<(typeof endpoints)[K]>;

/** One request and the translation the site runs on its response. */
export type Sample = {
  endpoint: Endpoint;
  /** Throws an `EspnParseError` when the response is not the shape the site reads. */
  translate: (response: unknown) => unknown;
};

/** Toronto: its page is the one the smoke tests visit, and its roster is where Rylan goes. */
const TEAM_ID = "21";
/** Auston Matthews, a skater. */
const SKATER_ID = "4024123";
/** Anthony Stolarz, a goalie: his stat tables have different columns from a skater's. */
const GOALIE_ID = "3067313";

const READS: {
  [K in Read]: {
    translate: (response: unknown, ...args: Args<K>) => unknown;
    /** The arguments of each sample request. At least one, so no read goes unchecked. */
    samples: [Args<K>, ...Args<K>[]];
  };
} = {
  // The current slate, and a fixed one of thirteen finished games, three decided in overtime.
  scoreboard: { translate: translateScoreboard, samples: [[], ["2026-10-03"]] },
  standings: { translate: translateStandings, samples: [[]] },
  teams: { translate: translateTeams, samples: [[]] },
  team: { translate: translateTeam, samples: [[TEAM_ID]] },
  teamSchedule: { translate: translateTeamSchedule, samples: [[TEAM_ID]] },
  // A finished game decided in a shootout: its plays end 3-2 where the final is 4-3.
  summary: { translate: translateGameSummary, samples: [["401803652"]] },
  player: { translate: translatePlayer, samples: [[SKATER_ID], [GOALIE_ID]] },
  playerCareer: { translate: translatePlayerCareer, samples: [[SKATER_ID], [GOALIE_ID]] },
  playerGameLog: { translate: translatePlayerGameLog, samples: [[SKATER_ID], [GOALIE_ID]] },
  // Ten players, the most a search returns.
  playerSearch: { translate: translatePlayerSearch, samples: [["mar"]] },
};

/** The request one read makes for these arguments, with its translation. */
export function sample<K extends Read>(read: K, ...args: Args<K>): Sample {
  const build = endpoints[read] as (...args: Args<K>) => Endpoint;
  const { translate } = READS[read];
  return { endpoint: build(...args), translate: (response) => translate(response, ...args) };
}

/** Every sample, in the order the site's reads are listed. */
export const SAMPLES: Sample[] = (Object.keys(READS) as Read[]).flatMap((read) =>
  (READS[read].samples as Args<Read>[]).map((args) => sample(read, ...args)),
);

/** The kinds of game whose summary is checked, in the order they are fetched. */
export const SLATE_STATUSES = ["live", "scheduled", "final"] as const;

/**
 * The summaries of games on a slate: one live, one scheduled and one final game, where the slate
 * has them. A slate changes daily, so these are chosen when the check runs, and the check runs
 * round the clock, so over a day it sees all three. The fixed finished game among the samples is
 * from a season that is over; a final from the slate is one ESPN wrote this week.
 */
export function summariesFromSlate(games: Pick<Game, "id" | "status">[]): Sample[] {
  return SLATE_STATUSES.flatMap((status) => {
    const game = games.find((candidate) => candidate.status === status);
    return game ? [sample("summary", game.id)] : [];
  });
}

type Matchup = { home: { id: string }; away: { id: string } };

/**
 * A team whose day is the other kind from the fixed team's: one with a game today when Toronto
 * has none, one without when it has. A team's detail carries its next game, which is a game
 * under way or just over on the one day and a game days off on the other.
 *
 * `teamIds` is every team in ESPN's order, or null when the team list failed. Answers the sample,
 * or the gap to list as not checked.
 */
export function secondTeam(
  games: Matchup[],
  teamIds: string[] | null,
): { sample: Sample } | { gap: string } {
  const playing = new Set(games.flatMap((game) => [game.home.id, game.away.id]));
  if (!playing.has(TEAM_ID)) {
    const [first] = playing;
    return first === undefined
      ? { gap: "a team with a game today: none on today's slate" }
      : { sample: sample("team", first) };
  }
  if (teamIds === null) return { gap: "a team without a game today: the team list failed" };
  const idle = teamIds.find((id) => !playing.has(id));
  return idle === undefined
    ? { gap: "a team without a game today: every team is on today's slate" }
    : { sample: sample("team", idle) };
}
