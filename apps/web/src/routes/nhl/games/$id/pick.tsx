import { createFileRoute } from "@tanstack/react-router";

/** A game's pick tab. The game is the route above's, and so is all that is drawn. */
export const Route = createFileRoute("/nhl/games/$id/pick")({});
