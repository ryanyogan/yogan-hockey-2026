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

/**
 * A team's bar in the penalty box and the ruling of the zone it attacks. In the Agate look both
 * are ink: the page has one red, and a club's colour is not it (`docs/design/agate.md`). `--team`
 * is still set where these are used, and nothing reads it.
 */
export const TEAM_BG = "bg-foreground";
export const TEAM_STROKE = "stroke-foreground";
