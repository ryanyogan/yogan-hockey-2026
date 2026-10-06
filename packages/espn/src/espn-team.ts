import type { Team } from "@yogan-hockey/schemas";
import { z } from "zod";

const EspnLogo = z.object({
  href: z.string(),
  rel: z.array(z.string()).default([]),
});

/**
 * A team as ESPN embeds it in a game, a standings entry, the team list and team detail. The
 * scoreboard sends one `logo`; everywhere else sends a list of `logos`.
 */
export const EspnTeam = z.object({
  id: z.string(),
  abbreviation: z.string(),
  displayName: z.string(),
  shortDisplayName: z.string(),
  location: z.string(),
  color: z.string().nullish(),
  logo: z.string().nullish(),
  logos: z.array(EspnLogo).nullish(),
});
type EspnTeam = z.infer<typeof EspnTeam>;

export function teamFrom(team: EspnTeam): Team {
  const logos = team.logos ?? [];
  const standard = logos.find((logo) => logo.rel.includes("default")) ?? logos[0];
  // The scoreboard variants are cropped for ESPN's own score strip; the plain dark logo matches
  // the default one.
  const dark = logos.find((logo) => logo.rel.includes("dark") && !logo.rel.includes("scoreboard"));
  return {
    id: team.id,
    abbreviation: team.abbreviation,
    name: team.displayName,
    shortName: team.shortDisplayName,
    location: team.location,
    color: team.color ?? null,
    logo: team.logo ?? standard?.href ?? null,
    logoDark: dark?.href ?? null,
  };
}
