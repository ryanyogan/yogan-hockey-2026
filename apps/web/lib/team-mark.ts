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
 * How large a mark is drawn. `row` is 14px, beside 13px type in a ledger row or the ticker;
 * `header` is 20px, beside a page's title; `line` is 1.2 times the type it stands in, for a line
 * that is not 13px (the 10px to 14px lines over the ice).
 */
export type TeamMarkSize = "row" | "line" | "header";

/** For a mark of about 14px: 28px is already twice that, so one file serves 1x and 2x. */
const SMALL: readonly [MarkFileSize, string][] = [
  [28, "2x"],
  [42, "3x"],
];
/** Which file serves which pixel density, the first being the plain `src`. */
const DENSITIES: Record<TeamMarkSize, readonly [MarkFileSize, string][]> = {
  row: SMALL,
  line: SMALL,
  header: [
    [28, "1x"],
    [42, "2x"],
    [84, "3x"],
  ],
};

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
  const files = DENSITIES[size].map(
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
 * page differs, that one too. Null for a team with no mark.
 */
export function teamMarkImages(
  teamId: string,
  size: TeamMarkSize,
  marks: Record<string, TeamMarkEntry>,
): { light: TeamMarkImage; dark: TeamMarkImage | null } | null {
  if (!Object.hasOwn(marks, teamId)) return null;
  const entry = marks[teamId];
  if (entry == null) return null;
  return {
    light: image(teamId, entry, false, size),
    dark: entry.dark ? image(teamId, entry, true, size) : null,
  };
}
