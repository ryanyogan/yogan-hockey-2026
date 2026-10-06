import type {
  PlayerCareer,
  PlayerProfile,
  PlayerSearchResult,
  RosterPlayer,
  StatColumn,
  Team,
} from "@yogan-hockey/schemas";
import type { Player } from "./players";

/*
 * The easter egg: a fictional Rylan Yogan, #99, centre of the Toronto Maple Leafs. He is at the
 * top of Toronto's roster, first in a search for any part of his name, and has a player page.
 * Everything about him is invented and none of it comes from ESPN; to the rest of the site he is
 * a player like any other, in the shapes ESPN's players come in (spec §7, ADR 0005).
 */

/** ESPN's ids are digits, so no player of ESPN's can ever have this one. */
export const LEGEND_ID = "rylan-yogan";

const NAME = "Rylan Yogan";
const JERSEY = "99";
const POSITION = "C";
const BIRTH_DATE = "1999-09-09";

const TORONTO: Team = {
  id: "21",
  abbreviation: "TOR",
  name: "Toronto Maple Leafs",
  shortName: "Maple Leafs",
  location: "Toronto",
  color: null,
  logo: null,
  logoDark: null,
};
const TORONTO_REF = { id: TORONTO.id, abbreviation: TORONTO.abbreviation, name: TORONTO.name };

const COLUMNS: StatColumn[] = [
  { name: "games", label: "GP" },
  { name: "goals", label: "G" },
  { name: "assists", label: "A" },
  { name: "points", label: "PTS" },
  { name: "plusMinus", label: "+/-" },
  { name: "penaltyMinutes", label: "PIM" },
];

/** The Parity Reference's eleven seasons, oldest first: GP, G, A, PTS, +/-, PIM. */
const SEASONS: readonly (readonly [number, number, number, number, number, number])[] = [
  [38, 78, 67, 145, 72, 0],
  [42, 98, 87, 185, 89, 2],
  [45, 112, 123, 235, 118, 4],
  [48, 134, 156, 290, 145, 6],
  [52, 89, 112, 201, 98, 8],
  [58, 67, 98, 165, 76, 12],
  [62, 78, 112, 190, 89, 16],
  [68, 89, 134, 223, 98, 14],
  [68, 112, 156, 268, 134, 18],
  [82, 98, 152, 250, 111, 22],
  [45, 58, 89, 147, 67, 12],
];

/**
 * The rest of this season's line, which the career table has no columns for: a real skater's page
 * has them from ESPN, and his reads the same. Labels are ESPN's own headings.
 */
const SEASON_EXTRAS: readonly (readonly [name: string, label: string, figure: number])[] = [
  ["shotsTotal", "S", 312],
  ["powerPlayGoals", "PPG", 18],
  ["powerPlayAssists", "PPA", 32],
  ["gameWinningGoals", "GWG", 12],
];

/** ESPN's year for the newest of them: 2027 is the 2026-27 season. */
const CURRENT_YEAR = 2027;
const PLUS_MINUS = COLUMNS.findIndex((column) => column.name === "plusMinus");

/** Figures as ESPN writes them: "1,013", and a plus/minus with its sign. */
function shown(figures: readonly number[]): string[] {
  return figures.map((figure, index) => {
    const text = figure.toLocaleString("en-US");
    return index === PLUS_MINUS && figure > 0 ? `+${text}` : text;
  });
}

const twoDigits = (year: number) => String(year % 100).padStart(2, "0");

function career(): PlayerCareer {
  const firstYear = CURRENT_YEAR - SEASONS.length + 1;
  return {
    playerId: LEGEND_ID,
    columns: COLUMNS,
    seasons: SEASONS.map((figures, index) => {
      const year = firstYear + index;
      return {
        year,
        season: `${twoDigits(year - 1)}-${twoDigits(year)}`,
        team: TORONTO_REF,
        values: shown(figures),
      };
    }),
    totals: shown(
      COLUMNS.map((_, column) => SEASONS.reduce((sum, row) => sum + (row[column] ?? 0), 0)),
    ),
  };
}

/** Whole years from a birth date to a day, both read as UTC. */
function ageOn(birthDate: string, today: Date): number {
  const born = new Date(`${birthDate}T00:00:00Z`);
  const years = today.getUTCFullYear() - born.getUTCFullYear();
  const hadBirthday =
    today.getUTCMonth() > born.getUTCMonth() ||
    (today.getUTCMonth() === born.getUTCMonth() && today.getUTCDate() >= born.getUTCDate());
  return hadBirthday ? years : years - 1;
}

function profile(today: Date): PlayerProfile {
  const [, goals, assists, points, plusMinus] = shown(SEASONS.at(-1) ?? []);
  const leading = (name: string, label: string, value: string | undefined) => ({
    name,
    label,
    value: value ?? "",
    rank: "1st",
  });
  return {
    id: LEGEND_ID,
    name: NAME,
    firstName: "Rylan",
    lastName: "Yogan",
    jersey: JERSEY,
    position: POSITION,
    positionName: "Center",
    headshot: null,
    team: TORONTO,
    height: `6' 2"`,
    weight: "195 lbs",
    birthDate: BIRTH_DATE,
    age: ageOn(BIRTH_DATE, today),
    birthPlace: "Center Ice, Ontario",
    draft: "2016: Rd 1, Pk 1 (TOR)",
    experience: `${SEASONS.length}th Season`,
    hand: "Right",
    active: true,
    seasonSummary: {
      title: `${CURRENT_YEAR - 1}-${twoDigits(CURRENT_YEAR)} regular season stats`,
      stats: [
        leading("goals", "G", goals),
        leading("assists", "A", assists),
        leading("points", "PTS", points),
        leading("plusMinus", "+/-", plusMinus),
        ...SEASON_EXTRAS.map(([name, label, figure]) => ({
          name,
          label,
          value: String(figure),
          rank: null,
        })),
      ],
    },
  };
}

/** His player page: a profile, a career and a game log with no games in it. */
export function legendPlayer(today: Date = new Date()): Player {
  return {
    profile: profile(today),
    career: career(),
    gameLog: { playerId: LEGEND_ID, season: null, columns: [], games: [] },
  };
}

/** His row in a search. */
export function legendSearchResult(): PlayerSearchResult {
  return {
    id: LEGEND_ID,
    name: NAME,
    jersey: JERSEY,
    position: POSITION,
    headshot: null,
    team: TORONTO_REF,
  };
}

/** Whether a search is for him: the query is any part of his name, in any case. */
export function searchFindsLegend(query: string): boolean {
  const wanted = query.trim().replace(/\s+/g, " ").toLowerCase();
  return wanted !== "" && NAME.toLowerCase().includes(wanted);
}

/** A team's roster as the site shows it: Toronto's has him first, ahead of every number. */
export function rosterWithLegend(teamId: string, roster: readonly RosterPlayer[]): RosterPlayer[] {
  if (teamId !== TORONTO.id) return [...roster];
  return [
    { id: LEGEND_ID, name: NAME, jersey: JERSEY, position: POSITION, headshot: null },
    ...roster,
  ];
}
