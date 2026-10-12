import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import { LedgerSkeleton } from "@yogan-hockey/ui/components/skeleton";
import type { ReactNode } from "react";
import { FIXED_GAME_COLUMNS, GAME_SCORE_CELL, GAME_TEXT_CELL } from "../scoreboard/game-ledger";

/**
 * `GameLedger`'s six columns: status, away, score, home, score, note. A team's cell is its name
 * and its record, and a bar of `lg` holds the place of both.
 */
const TEXT = { cellClassName: GAME_TEXT_CELL };
const SCORE = { width: "xs" as const, numeric: true, cellClassName: GAME_SCORE_CELL };
const GAME_COLUMNS = [
  { ...TEXT, width: "md" as const, className: FIXED_GAME_COLUMNS.status, detail: "fine" as const },
  { ...TEXT, width: "lg" as const, className: FIXED_GAME_COLUMNS.team },
  { ...SCORE, className: FIXED_GAME_COLUMNS.score },
  { ...TEXT, width: "lg" as const, className: FIXED_GAME_COLUMNS.team },
  { ...SCORE, className: FIXED_GAME_COLUMNS.score },
  { width: "lg" as const, className: FIXED_GAME_COLUMNS.note },
];

/** A phone's row has a second line under the status (the pick or the venue); a wide page's none. */
const SLATE_TABLE = "[&_[data-slot=ledger-detail]]:xl:hidden";

/**
 * All states occupy the live ledger's geometry, including when there is no next game: an unseen
 * one-row ledger in the slate's columns lies under whatever `TeamNow` draws, so the team's page
 * does not change height when its game starts or ends.
 */
export function TeamNowFrame({ children }: { children: ReactNode }) {
  return (
    <div data-slot="team-now" className="grid grid-cols-1">
      <div aria-hidden="true" className="invisible col-start-1 row-start-1 pointer-events-none">
        <Section>
          <SectionHeader title="Playing now" />
          <LedgerSkeleton
            className={`table-fixed ${SLATE_TABLE}`}
            columns={GAME_COLUMNS}
            rows={1}
          />
        </Section>
      </div>
      <div className="col-start-1 row-start-1">{children}</div>
    </div>
  );
}
