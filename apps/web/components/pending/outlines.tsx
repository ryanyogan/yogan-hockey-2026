import { SectionSkeleton } from "@yogan-hockey/ui/components/skeleton";
import type { ReactNode } from "react";
import { RINK } from "../../lib/game/rink";
import type { Outline } from "../../lib/pending-route";
import { GAME_COLUMNS, LiveSkeleton, SLATE_TABLE } from "../slate-skeleton";
import {
  NextGameSkeleton,
  RosterSkeleton,
  ScheduleSkeleton,
  TeamStatsSkeleton,
} from "../team/team-skeletons";

/**
 * What stands in for a page between the tap on a link and the page's arrival (#127), drawn in
 * the browser from the address alone. Each is the route's own loading outline where it has one
 * (`route-skeletons.tsx`, `team/team-skeletons.tsx`), under a bar for whatever the route's
 * layout draws first; the routes with no `loading.tsx` get a ledger of their usual shape.
 *
 * These are previews, not copies: a header's height depends on its text, which is not known
 * here, so the page that arrives replaces the whole outline in one frame (`PendingOutlet`).
 */

const FIGURES = [
  { width: "sm" as const },
  { width: "lg" as const, className: "w-full" },
  { width: "sm" as const, numeric: true },
  { width: "sm" as const, numeric: true },
];

/**
 * The room a game's rink takes, as an empty box of the rink's proportions. Not `GameSkeleton`'s
 * drawn rink: these outlines are in every route's script, and `Rink` brings the plays' code and
 * zod with it (27 kB gzipped), which only a game's page should load.
 */
const RINK_BOX = {
  aspectRatio: `${RINK.halfLength + RINK.margin} / ${RINK.halfWidth + RINK.margin}`,
};

/** The line a layout draws first: who the team, game or player is. */
function Identity({ label }: { label: string }) {
  return (
    <SectionSkeleton label={label} rows={1} columns={[{ width: "xl", className: "w-full" }]} />
  );
}

function Team({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4">
        <Identity label="Team" />
        <NextGameSkeleton />
      </div>
      {children}
    </>
  );
}

const TABS: Partial<Record<Outline, () => ReactNode>> = {
  "team-schedule": () => <ScheduleSkeleton />,
  "team-roster": () => <RosterSkeleton />,
  "team-stats": () => <TeamStatsSkeleton />,
  // A game's tabs have no outline: the page holds all three and draws the one tapped at once.
  "player-games": () => <SectionSkeleton label="Games" rows={8} columns={FIGURES} />,
};

const PAGES: Record<Outline, () => ReactNode> = {
  home: () => (
    <>
      <SectionSkeleton
        label="Tonight"
        rows={8}
        className={`table-fixed ${SLATE_TABLE}`}
        columns={GAME_COLUMNS}
      />
      <SectionSkeleton title="Standings" rows={8} columns={FIGURES} />
    </>
  ),
  standings: () => <SectionSkeleton title="NHL" rows={16} columns={FIGURES} />,
  live: () => <LiveSkeleton />,
  players: () => <SectionSkeleton title="Players" rows={3} columns={FIGURES} />,
  player: () => (
    <>
      <Identity label="Player" />
      <SectionSkeleton label="Season" rows={1} columns={FIGURES} />
      <SectionSkeleton label="Games" rows={5} columns={FIGURES} />
    </>
  ),
  "player-games": () => PAGES.player(),
  game: () => (
    <>
      <Identity label="Game" />
      <div aria-hidden="true" className="bg-secondary" style={RINK_BOX} />
      <SectionSkeleton
        label="The game"
        rows={6}
        columns={[{ width: "sm" }, { width: "sm" }, { width: "xl", className: "w-full" }]}
      />
    </>
  ),
  "game-tab": () => PAGES.game(),
  "team-schedule": () => (
    <Team>
      <ScheduleSkeleton />
    </Team>
  ),
  "team-roster": () => (
    <Team>
      <RosterSkeleton />
    </Team>
  ),
  "team-stats": () => (
    <Team>
      <TeamStatsSkeleton />
    </Team>
  ),
};

/** The outline of a whole page, or of the part under a team's, game's or player's tabs. */
export function OutlineOf({ outline, scope }: { outline: Outline; scope: "page" | "tab" }) {
  return (scope === "tab" ? (TABS[outline] ?? PAGES[outline]) : PAGES[outline])();
}
