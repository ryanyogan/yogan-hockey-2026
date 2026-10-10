import type { ScoreboardReading } from "@yogan-hockey/schemas";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { ScoreboardProvider } from "../components/scoreboard/scoreboard-provider";
import { Shell } from "../components/shell/shell";
import { PAGE_CACHE_REQUEST_HEADER } from "../lib/page-cache";
import { readScoreboard } from "../lib/scoreboard";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: { default: "Yogan Hockey", template: "%s · Yogan Hockey" },
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
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {/* The one Scoreboard socket: the ticker and every page read scores from it. */}
          <ScoreboardProvider initial={scoreboard}>
            <Shell>{children}</Shell>
          </ScoreboardProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
