import { SectionSkeleton } from "@yogan-hockey/ui/components/skeleton";
import { FIXED_GAME_COLUMNS } from "./scoreboard/game-ledger";

/**
 * The slate's placeholder, apart from `route-skeletons.tsx` because the outlines drawn at a tap
 * (`pending/outlines.tsx`) are in every route's script: that file imports the rink, which brings
 * the plays' code and zod with it, and only a game's page should load those (#127).
 */

/** A night's slate is anything from no games to sixteen; eight rows fill a laptop's window. */
const SLATE_ROWS = 8;

/**
 * `GameLedger`'s six columns: status, away, score, home, score, note. A team's cell is its mark
 * and its abbreviation, and a bar of `lg` holds the place of both.
 */
export const GAME_COLUMNS = [
  { width: "md" as const, className: FIXED_GAME_COLUMNS.status, detail: "fine" as const },
  { width: "lg" as const, className: FIXED_GAME_COLUMNS.team },
  { width: "xs" as const, numeric: true, className: FIXED_GAME_COLUMNS.score },
  { width: "lg" as const, className: FIXED_GAME_COLUMNS.team },
  { width: "xs" as const, numeric: true, className: FIXED_GAME_COLUMNS.score },
  { width: "lg" as const, className: FIXED_GAME_COLUMNS.note },
];

/** A phone's row has a second line under the status (the pick or the venue); a wide page's none. */
export const SLATE_TABLE = "[&_[data-slot=ledger-detail]]:xl:hidden";

/** `/nhl/live`: the heading, then the slate in the fixed columns its sections share. */
export function LiveSkeleton() {
  return (
    <>
      <header className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h1 className="font-bold uppercase">Live scores</h1>
      </header>
      <SectionSkeleton
        label="Today's games"
        rows={SLATE_ROWS}
        className={`table-fixed ${SLATE_TABLE}`}
        columns={GAME_COLUMNS}
      />
    </>
  );
}
