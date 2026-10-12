import { SectionSkeleton, SkeletonBar } from "@yogan-hockey/ui/components/skeleton";
import { PenaltyBoxSpace } from "./game/penalty-box";
import { Rink } from "./game/rink";
import { FIXED_GAME_COLUMNS, GAME_SCORE_CELL, GAME_TEXT_CELL } from "./scoreboard/game-ledger";

/**
 * The placeholders of the live page and a game's page (#95), each drawn by its
 * route's `loading.tsx`. As the team page's (`team/team-skeletons.tsx`): a placeholder repeats
 * the columns of the ledger it stands in for, so its rows are that ledger's rows.
 *
 * A slate's length is not known until the Scoreboard answers, and it stands at the top of its
 * page. So each page's placeholder is one piece, replaced at once by the whole page: nothing
 * that stays on the page is below a block that changes height.
 */

/** A night's slate is anything from no games to sixteen; eight rows fill a laptop's window. */
const SLATE_ROWS = 8;

/**
 * `GameLedger`'s six columns: status, away, score, home, score, note. A team's cell is its mark
 * and its abbreviation, and a bar of `lg` holds the place of both.
 */
const TEXT = { cellClassName: GAME_TEXT_CELL };
const SCORE = { width: "xs" as const, numeric: true, cellClassName: GAME_SCORE_CELL };
export const GAME_COLUMNS = [
  { ...TEXT, width: "md" as const, className: FIXED_GAME_COLUMNS.status, detail: "fine" as const },
  { ...TEXT, width: "lg" as const, className: FIXED_GAME_COLUMNS.team },
  { ...SCORE, className: FIXED_GAME_COLUMNS.score },
  { ...TEXT, width: "lg" as const, className: FIXED_GAME_COLUMNS.team },
  { ...SCORE, className: FIXED_GAME_COLUMNS.score },
  { width: "lg" as const, className: FIXED_GAME_COLUMNS.note },
];

/** A phone's row has a second line under the status (the pick or the venue); a wide page's none. */
export const SLATE_TABLE = "[&_[data-slot=ledger-detail]]:xl:hidden";

/** `/nhl/live`: the heading, then the slate in the fixed columns its sections share. */
export function LiveSkeleton() {
  return (
    <>
      <header className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h1 className="font-strong uppercase">Live scores</h1>
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

/**
 * `/nhl/games/:id`: the rink itself with nothing on it, which is the size of every state's rink;
 * the caption's line under it on a narrow page; the timeline's band and its hint; then the plays.
 */
export function GameSkeleton() {
  return (
    <div data-slot="game-skeleton">
      {/* The story: its heavy rule, then the kicker's, the headline's and the deck's lines. */}
      <div
        aria-hidden="true"
        className="mb-6 grid gap-x-8 gap-y-3 border-rule border-t-3 pt-[14px] lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]"
      >
        <div className="flex flex-col gap-3">
          <p className="text-[12px] leading-[1.35]">
            <SkeletonBar width="lg" />
          </p>
          <p className="text-[34px] leading-[1.02] md:text-[clamp(34px,3vw,40px)]">
            <SkeletonBar width="xl" />
          </p>
          <p className="text-[18px] leading-[1.4] md:text-[clamp(18px,1.4vw,19px)]">
            <SkeletonBar width="xl" />
          </p>
        </div>
        <div className="h-[89px] border-rule border-y" />
      </div>
      <div className="@container" aria-hidden="true">
        <Rink plays={[]} focus={null} />
        <PenaltyBoxSpace />
        <p className="mt-1 min-h-10 border-rule-head border-b py-0.5 text-small leading-[18px] @2xl:hidden">
          <SkeletonBar width="lg" />
        </p>
      </div>
      <div className="mt-4" aria-hidden="true">
        <div className="h-14 border border-rule" />
        <p className="mt-1">
          <SkeletonBar width="xl" />
        </p>
      </div>
      <div className="mt-8">
        <SectionSkeleton
          label="The game"
          rows={6}
          columns={[{ width: "sm" }, { width: "sm" }, { width: "xl", className: "w-full" }]}
        />
      </div>
    </div>
  );
}
