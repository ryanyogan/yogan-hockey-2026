import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";
import { type ReactNode, useEffect } from "react";
import { ScoreboardProvider } from "../../components/scoreboard/scoreboard-provider";
import { NotFoundPage } from "../../components/shell/not-found-page";
import { Shell } from "../../components/shell/shell";
import { ThemeColor } from "../../components/shell/theme-color";
import { readShell } from "../functions/shell";
import { siteHead } from "../head";

/**
 * The shell of every page: the document, the theme, the masthead, the score strip and the one
 * Scoreboard socket, around whatever route is open.
 *
 * Its loader reads the Scoreboard and the season's record once, so both are in the first HTML.
 * It is not read again as the visitor moves about (`staleTime`): after first paint today's games
 * are the socket's. It is read again with every other loader when the socket reports a final
 * (`lib/use-refresh-on-invalidation.ts`), which is what brings the dateline a new record.
 */
export const Route = createRootRoute({
  loader: () => readShell(),
  staleTime: Number.POSITIVE_INFINITY,
  head: siteHead,
  shellComponent: Document,
  component: Site,
  notFoundComponent: NotFoundPage,
});

function Document({ children }: { children: ReactNode }) {
  return (
    // next-themes sets the class on <html> before first paint, which React must not undo.
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function Site() {
  const { scoreboard, record } = Route.useLoaderData();
  useHydratedMark();
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ThemeColor />
      {/* The one Scoreboard socket: the masthead, the ticker and every page read scores from it. */}
      <ScoreboardProvider initial={scoreboard}>
        <Shell record={record}>
          <Outlet />
        </Shell>
      </ScoreboardProvider>
    </ThemeProvider>
  );
}

declare global {
  interface Window {
    /** True once the page has hydrated: a tap from then on is the router's, not a document load. */
    __APP_HYDRATED?: boolean;
    /** When that was, in milliseconds since the navigation started. */
    __APP_HYDRATED_AT?: number;
  }
}

/**
 * Marks the page as hydrated, for whatever measures it or drives it (`scripts/`, Playwright). An
 * effect of the root route's runs once the whole document has hydrated, since nothing in it is
 * deferred.
 */
function useHydratedMark() {
  useEffect(() => {
    window.__APP_HYDRATED = true;
    window.__APP_HYDRATED_AT = performance.now();
  }, []);
}
