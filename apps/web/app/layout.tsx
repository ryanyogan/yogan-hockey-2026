import type { ScoreboardReading } from "@yogan-hockey/schemas";
import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { ScoreboardProvider } from "../components/scoreboard/scoreboard-provider";
import { Shell } from "../components/shell/shell";
import { ThemeColor } from "../components/shell/theme-color";
import { APPLE_SPLASH_IMAGES } from "../lib/app-splash.generated";
import { APP_NAME, APP_SHORT_NAME, APPLE_ICON, FAVICON_PNG } from "../lib/install";
import { PAGE_CACHE_REQUEST_HEADER } from "../lib/page-cache";
import { readScoreboard } from "../lib/scoreboard";
import "./globals.css";

const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  applicationName: APP_NAME,
  // `app/manifest.ts`. vinext serves it and, unlike Next.js, does not link it by itself.
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: FAVICON_PNG, sizes: "64x64", type: "image/png" },
    ],
    apple: [{ url: APPLE_ICON, sizes: "180x180" }],
  },
  // iOS takes its home screen name, bars and splash from these, not from the manifest. "default"
  // keeps the page below the status bar, which iOS draws itself; "black-translucent" would lay
  // the page under white status text, unreadable on the paper theme.
  appleWebApp: {
    capable: true,
    title: APP_SHORT_NAME,
    statusBarStyle: "default",
    startupImage: [...APPLE_SPLASH_IMAGES],
  },
  // What `capable` writes is the standard name; iOS before 17.4 reads only Apple's.
  other: { "apple-mobile-web-app-capable": "yes" },
};

// `viewport-fit=cover` lets the page reach the screen's edges in an installed site, and makes
// `env(safe-area-inset-*)` say how far the notch and the home bar reach in (`globals.css`).
// The bars' colour is `ThemeColor`'s, since it follows the theme shown.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Today's games for the first paint of every page. A page is still worth showing when the
 * Scoreboard cannot be reached: it starts without games and the socket supplies them.
 */
async function scoreboardForFirstPaint(): Promise<ScoreboardReading> {
  try {
    return await readScoreboard();
  } catch (error) {
    console.error("Layout: could not read the Scoreboard", error);
    return { date: null, games: [], updatedAt: null, invalidatedAt: null, heardAt: null };
  }
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // A page the Worker keeps in the page cache (`lib/page-cache.ts`) is rendered without today's
  // games, which would be stale in it: they reach it on the socket. For any other page the read
  // is started and not awaited: the shell is sent at once and the games stream in behind it
  // (spec section 2), so no page waits on the Scoreboard for its first byte. It never rejects.
  const cached = (await headers()).has(PAGE_CACHE_REQUEST_HEADER);
  const scoreboard = cached ? null : scoreboardForFirstPaint();
  return (
    // next-themes sets the class on <html> before first paint, which React must not undo.
    <html lang="en" className={mono.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ThemeColor />
          {/* The one Scoreboard socket: the ticker and every page read scores from it. */}
          <ScoreboardProvider initial={scoreboard}>
            <Shell>{children}</Shell>
          </ScoreboardProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
