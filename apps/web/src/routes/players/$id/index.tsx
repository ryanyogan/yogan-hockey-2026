import { createFileRoute } from "@tanstack/react-router";
import { PlayerGames } from "../../../../components/players/player-games";

/** A player's default tab: his latest games. They are his route's to read (`route.tsx`). */
export const Route = createFileRoute("/players/$id/")({ component: PlayerGames });
