import { createFileRoute } from "@tanstack/react-router";

/** The plays, a game's first tab. The game is the route above's, and so is all that is drawn. */
export const Route = createFileRoute("/nhl/games/$id/")({});
