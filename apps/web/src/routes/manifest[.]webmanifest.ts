import { createFileRoute } from "@tanstack/react-router";
import { webAppManifest } from "../../lib/install";

/** `/manifest.webmanifest`, which every page's head links (`src/head.ts`). */
export const Route = createFileRoute("/manifest.webmanifest")({
  server: {
    handlers: {
      GET: () =>
        new Response(JSON.stringify(webAppManifest()), {
          headers: { "content-type": "application/manifest+json" },
        }),
    },
  },
});
