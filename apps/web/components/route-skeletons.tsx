import { SectionSkeleton, SkeletonBar } from "@yogan-hockey/ui/components/skeleton";
import { Rink } from "./game/rink";

/**
 * The placeholders of the live page and a game's page (#95), each drawn by its
 * route's `loading.tsx`. As the team page's (`team/team-skeletons.tsx`): a placeholder repeats
 * the columns of the ledger it stands in for, so its rows are that ledger's rows.
 *
 * A slate's length is not known until the Scoreboard answers, and it stands at the top of its
 * page. So each page's placeholder is one piece, replaced at once by the whole page: nothing
 * that stays on the page is below a block that changes height.
 */

export { GAME_COLUMNS, LiveSkeleton, SLATE_TABLE } from "./slate-skeleton";

/**
 * `/nhl/games/:id`: the rink itself with nothing on it, which is the size of every state's rink;
 * the caption's line under it on a narrow page; the timeline's band and its hint; then the plays.
 */
export function GameSkeleton() {
  return (
    <div data-slot="game-skeleton">
      <div className="@container" aria-hidden="true">
        <Rink plays={[]} focus={null} />
        <p className="mt-1 min-h-10 bg-secondary px-2 py-0.5 leading-[18px] @2xl:hidden">
          <SkeletonBar width="lg" />
        </p>
      </div>
      <div className="mt-6" aria-hidden="true">
        <div className="h-12 bg-secondary" />
        <p className="mt-1">
          <SkeletonBar width="xl" />
        </p>
      </div>
      <div className="mt-6">
        <SectionSkeleton
          label="The game"
          rows={6}
          density="compact"
          columns={[{ width: "sm" }, { width: "sm" }, { width: "xl", className: "w-full" }]}
        />
      </div>
    </div>
  );
}
