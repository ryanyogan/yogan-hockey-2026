import { z } from "zod";
import type { Standings, StandingsRow } from "./standings.ts";

/** The four ways `/nhl` lays out the standings. The value is what the URL holds. */
export const StandingsViewSchema = z.enum(["division", "conference", "wildcard", "league"]);
export type StandingsView = z.infer<typeof StandingsViewSchema>;

/** One table of a standings view. */
export type StandingsTable = {
  /** "Atlantic Division", "Eastern Conference", "Wild Card", "National Hockey League" */
  title: string;
  /** The conference the table belongs to; null for the league table. */
  conference: string | null;
  /** Ranked, best first. */
  rows: StandingsRow[];
  /** How many rows from the top hold a playoff place, for drawing the line; null for none. */
  playoffSpots: number | null;
};

const DIVISION_PLAYOFF_SPOTS = 3;
const WILD_CARD_SPOTS = 2;

/**
 * The NHL's order: points, then fewer games played, then regulation wins, then regulation and
 * overtime wins, then all wins. The head-to-head tiebreaker that follows is not in the data, so
 * goal differential and goals for come next, as they do after it in the NHL's own list.
 */
function byRank(a: StandingsRow, b: StandingsRow): number {
  return (
    b.points - a.points ||
    a.gamesPlayed - b.gamesPlayed ||
    b.regulationWins - a.regulationWins ||
    b.regulationPlusOvertimeWins - a.regulationPlusOvertimeWins ||
    b.wins - a.wins ||
    b.goalDifferential - a.goalDifferential ||
    b.goalsFor - a.goalsFor ||
    a.team.name.localeCompare(b.team.name)
  );
}

function ranked(rows: StandingsRow[]): StandingsRow[] {
  return rows.toSorted(byRank);
}

/** Rows grouped by a name, keeping the order in which each name first appears. */
function groupedBy(
  rows: StandingsRow[],
  name: (row: StandingsRow) => string,
): [string, StandingsRow[]][] {
  const groups = new Map<string, StandingsRow[]>();
  for (const row of rows) {
    const group = groups.get(name(row));
    if (group) group.push(row);
    else groups.set(name(row), [row]);
  }
  return [...groups];
}

function divisionTables(rows: StandingsRow[], keep?: number): StandingsTable[] {
  return groupedBy(rows, (row) => row.division.name).map(([title, divisionRows]) => ({
    title,
    conference: divisionRows[0]?.conference.name ?? null,
    rows: ranked(divisionRows).slice(0, keep),
    playoffSpots: DIVISION_PLAYOFF_SPOTS,
  }));
}

/** Lays the standings out as one of the four views: the tables to draw, in order. */
export function standingsView(standings: Standings, view: StandingsView): StandingsTable[] {
  const { rows } = standings;
  const conferences = groupedBy(rows, (row) => row.conference.name);

  switch (view) {
    case "league":
      return [
        {
          title: "National Hockey League",
          conference: null,
          rows: ranked(rows),
          playoffSpots: null,
        },
      ];
    case "conference":
      return conferences.map(([conference, conferenceRows]) => ({
        title: conference,
        conference,
        rows: ranked(conferenceRows),
        // Eight teams qualify, but not always the top eight: a division's third can rank lower.
        playoffSpots: null,
      }));
    case "division":
      return divisionTables(rows);
    case "wildcard":
      return conferences.flatMap(([conference, conferenceRows]) => {
        const leaders = divisionTables(conferenceRows, DIVISION_PLAYOFF_SPOTS);
        const placed = new Set(leaders.flatMap((table) => table.rows));
        return [
          ...leaders,
          {
            title: "Wild Card",
            conference,
            rows: ranked(conferenceRows.filter((row) => !placed.has(row))),
            playoffSpots: WILD_CARD_SPOTS,
          },
        ];
      });
  }
}
