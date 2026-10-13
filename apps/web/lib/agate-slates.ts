import type {
  MadeSlatePick,
  ScoreboardGame,
  ScoreboardState,
  SeasonRecord,
} from "@yogan-hockey/schemas";

/*
 * The two slates the Agate prototype draws (`prototypes/agate/data.js`), as the Scoreboard would
 * carry them, with their picks and season records: what `scripts/front-page-check.mjs` measures on
 * `/skeleton/dashboard` so Home can be measured against the prototype word for word.
 */

const TEAMS: Record<string, [location: string, shortName: string]> = {
  BUF: ["Buffalo", "Sabres"],
  CAR: ["Carolina", "Hurricanes"],
  CHI: ["Chicago", "Blackhawks"],
  DET: ["Detroit", "Red Wings"],
  FLA: ["Florida", "Panthers"],
  LA: ["Los Angeles", "Kings"],
  MIN: ["Minnesota", "Wild"],
  MTL: ["Montreal", "Canadiens"],
  NJ: ["New Jersey", "Devils"],
  NSH: ["Nashville", "Predators"],
  NYI: ["New York", "Islanders"],
  NYR: ["New York", "Rangers"],
  OTT: ["Ottawa", "Senators"],
  PHI: ["Philadelphia", "Flyers"],
  SEA: ["Seattle", "Kraken"],
  STL: ["St. Louis", "Blues"],
  TOR: ["Toronto", "Maple Leafs"],
  UTA: ["Utah", "Mammoth"],
  VAN: ["Vancouver", "Canucks"],
  VGK: ["Vegas", "Golden Knights"],
  WSH: ["Washington", "Capitals"],
};

type Side = [abbreviation: string, record: string, score?: number];
type Sample = {
  status: ScoreboardGame["status"];
  /** The start, in UTC. A slate's order is by start, so the prototype's order is kept by these. */
  start: string;
  away: Side;
  home: Side;
  venue: string;
  tv: string;
  /** The picked club and its chance. */
  pick?: [abbreviation: string, winProbability: number];
  period?: number;
  clock?: string;
};

export type AgateSlate = {
  scoreboard: ScoreboardState;
  picks: Record<string, MadeSlatePick>;
  record: SeasonRecord;
};

function slate(date: string, record: SeasonRecord, samples: Sample[]): AgateSlate {
  const picks: Record<string, MadeSlatePick> = {};
  const games = samples.map((sample, index): ScoreboardGame => {
    const id = `agate-${date}-${index + 1}`;
    const side = ([abbreviation, teamRecord, score = 0]: Side, other: Side) => ({
      id: abbreviation,
      abbreviation,
      location: TEAMS[abbreviation]?.[0],
      shortName: TEAMS[abbreviation]?.[1],
      logo: null,
      logoDark: null,
      score,
      winner: sample.status === "final" && score > (other[2] ?? 0),
      record: teamRecord,
    });
    if (sample.pick) {
      const [pickTeamId, winProbability] = sample.pick;
      picks[id] = { status: "made", pickTeamId, winProbability };
    }
    return {
      id,
      startTime: sample.start,
      seasonType: 2,
      status: sample.status,
      period: sample.period ?? (sample.status === "final" ? 3 : 0),
      clock: sample.clock ?? "0:00",
      detail: "",
      venue: sample.venue,
      broadcasts: sample.tv.split(", "),
      away: side(sample.away, sample.home),
      home: side(sample.home, sample.away),
    };
  });
  return { scoreboard: { date, updatedAt: null, invalidatedAt: null, games }, picks, record };
}

export const AGATE_SLATES: Record<string, AgateSlate> = {
  tonight: slate("2026-10-11", { right: 29, wrong: 14 }, [
    {
      status: "final",
      start: "2026-10-11T21:00:00Z",
      away: ["SEA", "4-2-0", 5],
      home: ["WSH", "3-2-0", 3],
      pick: ["WSH", 63],
      venue: "Capital One Arena",
      tv: "ESPN+, MNMT, KONG, KHN, Prime Video (Local)",
    },
    {
      status: "final",
      start: "2026-10-11T21:30:00Z",
      away: ["VAN", "2-5-0", 2],
      home: ["NYR", "5-2-0", 6],
      pick: ["NYR", 62],
      venue: "Madison Square Garden",
      tv: "ESPN+, MSG",
    },
    {
      status: "final",
      start: "2026-10-11T22:00:00Z",
      away: ["CAR", "5-1-1", 4],
      home: ["PHI", "0-5-2", 1],
      pick: ["CAR", 78],
      venue: "Xfinity Mobile Arena",
      tv: "NHL Net, NBC Sports Phil, CARNHL",
    },
  ]),
  busy: slate("2026-10-06", { right: 3, wrong: 2 }, [
    {
      status: "final",
      start: "2026-10-06T21:00:00Z",
      away: ["CAR", "1-1-1", 2],
      home: ["MTL", "1-0-1", 3],
      pick: ["MTL", 52],
      venue: "Bell Centre",
      tv: "ESPN+, CARNHL",
    },
    {
      status: "final",
      start: "2026-10-06T21:10:00Z",
      period: 4,
      away: ["NSH", "1-1-0", 3],
      home: ["TOR", "1-2-0", 4],
      pick: ["TOR", 58],
      venue: "Scotiabank Arena",
      tv: "ESPN+, Scripps Sports",
    },
    {
      status: "final",
      start: "2026-10-06T21:20:00Z",
      away: ["OTT", "2-0-0", 4],
      home: ["DET", "0-2-0", 1],
      venue: "Little Caesars Arena",
      tv: "ESPN+, DSN",
    },
    {
      status: "live",
      start: "2026-10-06T23:00:00Z",
      period: 3,
      clock: "18:44",
      away: ["UTA", "2-1-0", 2],
      home: ["NJ", "1-1-0", 2],
      pick: ["NJ", 61],
      venue: "Prudential Center",
      tv: "ESPN+, MSGSN, Utah 16",
    },
    {
      status: "live",
      start: "2026-10-06T23:10:00Z",
      period: 4,
      clock: "2:10",
      away: ["MIN", "2-0-0", 3],
      home: ["BUF", "1-1-0", 3],
      pick: ["BUF", 64],
      venue: "KeyBank Center",
      tv: "ESPN+, MSGB, MINNHL",
    },
    {
      status: "live",
      start: "2026-10-06T23:20:00Z",
      period: 3,
      clock: "9:02",
      away: ["NYI", "1-1-0", 1],
      home: ["NYR", "3-1-0", 2],
      pick: ["NYR", 53],
      venue: "Madison Square Garden",
      tv: "ESPN",
    },
    {
      status: "live",
      start: "2026-10-06T23:30:00Z",
      period: 2,
      clock: "14:20",
      away: ["STL", "1-1-0", 0],
      home: ["CHI", "0-3-0", 1],
      pick: ["CHI", 56],
      venue: "United Center",
      tv: "ESPN+, CHSN, Blues App, BN+",
    },
    {
      status: "scheduled",
      start: "2026-10-07T00:40:00Z",
      away: ["VGK", "2-1-0"],
      home: ["SEA", "2-1-0"],
      pick: ["SEA", 59],
      venue: "Climate Pledge Arena",
      tv: "ESPN+, Scripps Sports, KONG, KING 5, KHN, Prime Video (Local)",
    },
    {
      status: "scheduled",
      start: "2026-10-07T01:00:00Z",
      away: ["FLA", "1-0-2"],
      home: ["LA", "0-1-1"],
      pick: ["LA", 62],
      venue: "crypto.com Arena",
      tv: "ESPN",
    },
  ]),
};
