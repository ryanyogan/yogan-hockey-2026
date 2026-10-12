import { EspnFetchError } from "@yogan-hockey/espn";
import type { TeamDetail } from "@yogan-hockey/schemas";
import { cachedTeam } from "./espn";
import { isTeamId } from "./team-page";

/**
 * The team behind `/nhl/teams/:id`, or null when there is no such team: the page then answers
 * "team not found". ESPN failing in any other way stays an error.
 */
export async function findTeam(id: string): Promise<TeamDetail | null> {
  if (!isTeamId(id)) return null;
  try {
    return await cachedTeam(id);
  } catch (error) {
    if (error instanceof EspnFetchError && error.notFound) return null;
    throw error;
  }
}
