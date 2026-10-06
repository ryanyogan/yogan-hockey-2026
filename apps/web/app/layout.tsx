import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { Shell } from "../components/shell/shell";
import "./globals.css";

const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: { default: "Yogan Hockey", template: "%s · Yogan Hockey" },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
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
          <Shell>{children}</Shell>
        </ThemeProvider>
      </body>
    </html>
  );
}
