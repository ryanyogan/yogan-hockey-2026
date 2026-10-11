import { perRequest } from "./per-request";
import { loadPlayer } from "./players";
export const playerOf = (id: string) => perRequest(`load-player:${id}`, () => loadPlayer(id));
