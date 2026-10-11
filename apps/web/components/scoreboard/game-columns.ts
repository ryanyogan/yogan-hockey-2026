/**
 * `GameLedger`'s cell and column classes, in a file that imports nothing: the ledger's placeholder
 * (`components/slate-skeleton.tsx`) repeats them, and it is drawn by the outlines every `Link`
 * reaches (#127). Taken from `game-ledger.tsx`, which imports `Link`, they were read before that
 * module had finished loading, and the page failed.
 */

/**
 * A cell of text: on a phone its first line stays level with its neighbours' first lines, and the
 * row is its two lines and 8px above and below (55px with its rule). Exported, with the score's,
 * for the ledger's placeholder, whose rows are then the same height.
 */
export const GAME_TEXT_CELL = "whitespace-nowrap max-md:py-2 max-md:align-top";

/**
 * A score on a phone starts level with the first line beside it. A finished game's losing score
 * steps back, so the winner's is found first.
 */
export const GAME_SCORE_CELL = "max-md:pt-2! max-md:pl-0 max-md:align-top";

/** Column widths that are the same in every ledger, so one under another lines up. */
export const FIXED_GAME_COLUMNS = {
  status: "w-28 sm:w-36",
  team: "sm:w-52",
  score: "w-8 sm:w-14",
  note: "max-xl:hidden",
};
