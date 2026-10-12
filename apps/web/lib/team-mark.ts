/**
 * Where a team's mark is: the small logo drawn before its abbreviation or name. The marks are the
 * site's own files (`public/team-marks/`, written by `pnpm team-marks`), found by ESPN's team id
 * alone, so anything that names a team can draw its mark without reading the team.
 */

/** One team in the list of marks: the hash in its files' names, and whether it has a dark logo. */
export interface TeamMarkEntry {
  v: string;
  dark: boolean;
}

/** The widths, in pixels, each mark is written at. */
export const MARK_SIZES = [28, 42, 84] as const;
type MarkFileSize = (typeof MARK_SIZES)[number];

/**
 * How large a mark is drawn. `row` and `line` are 1.2 times the type they stand in: 15.6px beside
 * 13px type in a ledger row or the ticker, 18px beside a phone's 15px. `header` is 20px, beside a
 * page's title. `headline` stands in a serif headline (a team's name on its page) at the height
 * of its capitals: 0.72 of the type, 24.5 to 28.8px.
 */
export type TeamMarkSize = "row" | "line" | "header" | "headline";

/**
 * Which file serves which pixel density, the first being the plain `src`. One list for every
 * size but a headline's: a mark is between 13 and 20px, so 28px covers it once, 42px twice (a phone's 18px mark
 * wants 36) and 84px three times.
 */
const DENSITIES: readonly [MarkFileSize, string][] = [
  [28, "1x"],
  [42, "2x"],
  [84, "3x"],
];

/**
 * The same for a headline's mark, which is up to 28.8px: 42px covers it once and 84px twice and,
 * a phone's being 24.5px, three times there.
 */
const HEADLINE_DENSITIES: readonly [MarkFileSize, string][] = [
  [42, "1x"],
  [84, "2x"],
];

export interface TeamMarkImage {
  src: string;
  srcSet: string;
}

/** A mark's file name: "21-dark-28.0a1b2c3d.webp". */
export function teamMarkFile(
  teamId: string,
  entry: TeamMarkEntry,
  dark: boolean,
  size: MarkFileSize,
): string {
  return `${teamId}${dark ? "-dark" : ""}-${size}.${entry.v}.webp`;
}

function image(
  teamId: string,
  entry: TeamMarkEntry,
  dark: boolean,
  size: TeamMarkSize,
): TeamMarkImage {
  const files = (size === "headline" ? HEADLINE_DENSITIES : DENSITIES).map(
    ([width, density]) =>
      [`/team-marks/${teamMarkFile(teamId, entry, dark, width)}`, density] as const,
  );
  return {
    src: files[0]?.[0] ?? "",
    srcSet: files.map(([file, density]) => `${file} ${density}`).join(", "),
  };
}

/**
 * The images for a team's mark: the one for a light page and, where the team's logo for a dark
 * page differs, that one too. Null for a team with no mark. `size` picks the files: a headline's
 * mark is larger than the rest and takes the larger ones.
 */
export function teamMarkImages(
  teamId: string,
  marks: Record<string, TeamMarkEntry>,
  size: TeamMarkSize = "row",
): { light: TeamMarkImage; dark: TeamMarkImage | null } | null {
  if (!Object.hasOwn(marks, teamId)) return null;
  const entry = marks[teamId];
  if (entry == null) return null;
  return {
    light: image(teamId, entry, false, size),
    dark: entry.dark ? image(teamId, entry, true, size) : null,
  };
}
