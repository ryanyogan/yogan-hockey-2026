// PROTOTYPE mock data. Every number here is invented.
export type Team = { abbr: string; name: string; record: string };
export type Game = {
  id: string;
  away: Team;
  home: Team;
  awayScore: number;
  homeScore: number;
  state: "live" | "pre" | "final";
  period?: string;
  clock?: string;
  start?: string;
  pick?: string;
  favorite?: boolean;
};

const t = (abbr: string, name: string, record: string): Team => ({ abbr, name, record });
export const logo = (abbr: string) =>
  `https://a.espncdn.com/i/teamlogos/nhl/500/${abbr.toLowerCase()}.png`;

export const games: Game[] = [
  { id: "1", away: t("TOR", "Maple Leafs", "2-0-0"), home: t("MTL", "Canadiens", "1-1-0"), awayScore: 2, homeScore: 1, state: "live", period: "2nd", clock: "12:34", favorite: true },
  { id: "2", away: t("CHI", "Blackhawks", "1-1-0"), home: t("DET", "Red Wings", "0-2-0"), awayScore: 0, homeScore: 0, state: "live", period: "1st", clock: "04:10", favorite: true },
  { id: "3", away: t("BOS", "Bruins", "1-0-1"), home: t("NYR", "Rangers", "2-0-0"), awayScore: 0, homeScore: 0, state: "pre", start: "7:00 PM", pick: "Rangers 58%" },
  { id: "4", away: t("EDM", "Oilers", "1-1-0"), home: t("VAN", "Canucks", "1-0-1"), awayScore: 0, homeScore: 0, state: "pre", start: "10:00 PM", pick: "Oilers 54%" },
  { id: "5", away: t("FLA", "Panthers", "2-1-0"), home: t("TB", "Lightning", "1-2-0"), awayScore: 4, homeScore: 2, state: "final" },
  { id: "6", away: t("COL", "Avalanche", "2-0-1"), home: t("DAL", "Stars", "2-1-0"), awayScore: 2, homeScore: 3, state: "final", period: "OT" },
];

export const standings = [
  ["TOR", 2, 0, 0, 4], ["NYR", 2, 0, 0, 4], ["FLA", 2, 1, 0, 4], ["BOS", 1, 0, 1, 3],
  ["MTL", 1, 1, 0, 2], ["CHI", 1, 1, 0, 2], ["TB", 1, 2, 0, 2], ["DET", 0, 2, 0, 0],
] as [string, number, number, number, number][];

export const tracked = [
  {
    slug: "andrew", name: "Andrew Yogan", pos: "F", team: "ESV Kaufbeuren", league: "Oberliga Süd",
    season: { GP: 6, G: 3, A: 5, PTS: 8 },
    today: { label: "Tonight 19:30", line: "vs Deggendorfer SC" },
    last: "W 5-3 at EV Füssen · 1 G, 1 A",
  },
  {
    slug: "rylan", name: "Rylan Yogan", pos: "C", team: "Falcons Peewee A2", league: "CSDHL",
    season: null as null | Record<string, number>,
    today: null as null | { label: string; line: string },
    last: "W 4-2 vs Jets · Next: Sat 9:15 AM at Huskies",
  },
];

export const favorites = [
  { name: "Auston Matthews", team: "TOR", line: "2 GP · 3 G · 1 A", live: true },
  { name: "Connor Bedard", team: "CHI", line: "2 GP · 1 G · 2 A", live: true },
  { name: "Connor McDavid", team: "EDM", line: "2 GP · 0 G · 4 A", live: false },
  { name: "Cale Makar", team: "COL", line: "3 GP · 1 G · 3 A", live: false },
];

export type Play = {
  id: number; period: 1 | 2; time: string; team: "TOR" | "MTL";
  type: "goal" | "shot" | "save" | "penalty" | "hit" | "faceoff";
  text: string; x: number; y: number; score?: string;
};

// x: -100..100 (MTL defends left), y: -42.5..42.5, like the NHL API's rink coordinates.
export const plays: Play[] = [
  { id: 1, period: 1, time: "00:00", team: "TOR", type: "faceoff", text: "Matthews wins the opening faceoff", x: 0, y: 0 },
  { id: 2, period: 1, time: "02:14", team: "TOR", type: "shot", text: "Nylander wrist shot, wide", x: -62, y: 18 },
  { id: 3, period: 1, time: "05:41", team: "MTL", type: "hit", text: "Xhekaj hit on Knies", x: 44, y: -38 },
  { id: 4, period: 1, time: "07:02", team: "MTL", type: "save", text: "Suzuki snap shot, saved by Woll", x: 71, y: -9 },
  { id: 5, period: 1, time: "09:27", team: "TOR", type: "goal", text: "Matthews (1) from Marner, Rielly", x: -78, y: -6, score: "TOR 1, MTL 0" },
  { id: 6, period: 1, time: "13:50", team: "MTL", type: "penalty", text: "Gallagher, 2 min for tripping", x: -30, y: 22 },
  { id: 7, period: 1, time: "14:33", team: "TOR", type: "save", text: "Tavares tip, saved by Montembeault", x: -84, y: 4 },
  { id: 8, period: 1, time: "18:05", team: "MTL", type: "goal", text: "Caufield (2) from Suzuki", x: 80, y: 11, score: "TOR 1, MTL 1" },
  { id: 9, period: 2, time: "00:00", team: "MTL", type: "faceoff", text: "Suzuki wins the faceoff", x: 0, y: 0 },
  { id: 10, period: 2, time: "01:48", team: "TOR", type: "shot", text: "Rielly slap shot, blocked", x: -40, y: -20 },
  { id: 11, period: 2, time: "03:19", team: "TOR", type: "goal", text: "Rylan Yogan (1) from Matthews", x: -74, y: 9, score: "TOR 2, MTL 1" },
  { id: 12, period: 2, time: "05:02", team: "MTL", type: "save", text: "Slafkovsky backhand, saved by Woll", x: 82, y: -3 },
  { id: 13, period: 2, time: "06:40", team: "TOR", type: "hit", text: "McCabe hit on Dach", x: 15, y: 39 },
  { id: 14, period: 2, time: "07:26", team: "MTL", type: "shot", text: "Hutson point shot, wide", x: 38, y: 25 },
];

export const prediction = {
  pick: "Maple Leafs 61%",
  reason: "Toronto has out-shot opponents in both games and Montreal is on the second night of a back-to-back.",
};
