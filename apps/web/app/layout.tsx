import type { ScoreboardReading } from "@yogan-hockey/schemas";
import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { ScoreboardProvider } from "../components/scoreboard/scoreboard-provider";
import { Shell } from "../components/shell/shell";
import { readScoreboard } from "../lib/scoreboard";
import "./globals.css";

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

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // Not awaited: the shell is sent at once and the games stream in behind it (spec section 2),
  // so no page waits on the Scoreboard for its first byte. It never rejects (see above).
  const scoreboard = scoreboardForFirstPaint();
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
          {/* The one Scoreboard socket: the ticker and every page read scores from it. */}
          <ScoreboardProvider initial={scoreboard}>
            <Shell>{children}</Shell>
          </ScoreboardProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
