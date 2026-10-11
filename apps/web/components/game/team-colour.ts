import type { GameHeaderSide } from "@yogan-hockey/schemas";
import type { CSSProperties } from "react";

/**
 * A team's colour for a mark on the page, as `--team`. Navy on slate would not show (Buffalo's),
 * so the dark theme lifts every colour towards white; a team ESPN sends no colour for gets the
 * text's.
 */
export function teamColour(side: Pick<GameHeaderSide, "color">): CSSProperties {
  return { "--team": side.color == null ? "currentColor" : `#${side.color}` } as CSSProperties;
}

/** `--team` as a background and as a stroke, lifted in the dark theme. */
export const TEAM_BG = "bg-(--team) dark:bg-[color-mix(in_oklab,var(--team),white_30%)]";
export const TEAM_STROKE =
  "stroke-(--team) dark:stroke-[color-mix(in_oklab,var(--team),white_30%)]";
