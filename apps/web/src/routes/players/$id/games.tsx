import { createFileRoute } from "@tanstack/react-router";
import { PlayerGames } from "../../../../components/players/player-games";

/** Every game of a player's log. They are his route's to read (`route.tsx`). */
export const Route = createFileRoute("/players/$id/games")({
  component: () => <PlayerGames all />,
});
