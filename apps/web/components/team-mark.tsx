import { type TeamMarkSize, teamMarkImages } from "../lib/team-mark";
import { TEAM_MARKS } from "../lib/team-marks.generated";

/**
 * The box a mark is drawn in. It is the size it is whether its image has loaded, failed or does
 * not exist, and it never makes its line taller: 14px sits inside a line of 13px type, lowered 2px
 * so its middle is the capitals' middle, and the 20px box gives back with a negative margin what
 * it has over the line.
 */
const BOX: Record<TeamMarkSize, { px: number; className: string }> = {
  row: { px: 14, className: "size-3.5 align-[-2px]" },
  line: { px: 14, className: "size-[1.2em] align-[-0.24em]" },
  header: { px: 20, className: "-my-1 size-5 align-[-5px]" },
};
const HUNG: Record<TeamMarkSize, string> = {
  row: "size-3.5",
  line: "size-[1.2em]",
  header: "size-5",
};

/**
 * A team's mark: its logo, small, in the slot before its abbreviation or name. The slot is the
 * box and the 6px after it (`className` replaces the gap where a layout has its own), and it is
 * kept for a team with no mark, so the text in a column starts at one x whatever the row.
 *
 * The images are the site's own (`lib/team-mark.ts`). A team whose logo differs on a dark page
 * has both in the markup and CSS shows one, since the server does not know the theme. Both are
 * then lazy, because a lazy image that is not displayed is never requested; `eager` is for a mark
 * above the fold and holds only for a team with one logo.
 *
 * The mark is decoration beside the team's name, so its `alt` is empty. Give `label` (the team's
 * name) where it stands alone.
 */
export function TeamMark({
  teamId,
  size = "row",
  label = "",
  eager = false,
  hang = false,
  className = hang ? "right-1.5" : "mr-1.5",
}: {
  /** ESPN's team id. Without one (a player with no club) the slot is still kept. */
  teamId: string | null | undefined;
  size?: TeamMarkSize;
  label?: string;
  eager?: boolean;
  /**
   * Hangs the mark to the left of where it is written, taking no room at all: for a table whose
   * column widths come from what is in them, where the column before has the room to spare.
   */
  hang?: boolean;
  className?: string;
}) {
  const box = BOX[size];
  const images = teamId == null ? null : teamMarkImages(teamId, size, TEAM_MARKS);
  const sized = { width: box.px, height: box.px, decoding: "async" } as const;
  const place = hang
    ? `absolute top-[calc(50%-0.5px)] -translate-y-1/2 ${HUNG[size]}`
    : box.className;
  const mark = (
    <span
      data-slot="team-mark"
      className={`inline-block shrink-0 overflow-hidden ${place} ${className}`}
    >
      {images != null && (
        <img
          alt={label}
          {...sized}
          {...images.light}
          loading={eager && images.dark == null ? "eager" : "lazy"}
          className={`block size-full object-contain ${images.dark == null ? "" : "dark:hidden"}`}
        />
      )}
      {images?.dark != null && (
        <img
          alt={label}
          {...sized}
          {...images.dark}
          loading="lazy"
          className="hidden size-full object-contain dark:block"
        />
      )}
    </span>
  );
  // An empty inline box is as high as its line's type and has no width: the mark is placed by it.
  return hang ? <span className="relative">{mark}</span> : mark;
}
