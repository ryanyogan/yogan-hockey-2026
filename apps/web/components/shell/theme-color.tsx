"use client";

import { useTheme } from "next-themes";
import { type ShownTheme, shownThemeColors } from "../../lib/install";
import { useHydrated } from "../../lib/use-hydrated";

/**
 * The colour of the browser's own bars (Android's status bar and task switcher, Safari's tab
 * bar): the page background of the theme shown, so an installed site has no band of another
 * colour above it.
 *
 * The server does not know the theme, so it sends each of the operating system's preferences its
 * own theme's colour, which is right until a visitor's own choice differs. Once the page has
 * hydrated the theme shown is known and both are given its colour. React hoists the tags into
 * the head, where they stay from page to page with the layout.
 */
export function ThemeColor() {
  const { resolvedTheme } = useTheme();
  // The browser's first render must repeat the server's, which had no theme.
  const hydrated = useHydrated();
  const shown: ShownTheme | undefined = !hydrated
    ? undefined
    : resolvedTheme === "dark"
      ? "dark"
      : "light";
  const colors = shownThemeColors(shown);
  return (
    <>
      <meta name="theme-color" media="(prefers-color-scheme: light)" content={colors.light} />
      <meta name="theme-color" media="(prefers-color-scheme: dark)" content={colors.dark} />
    </>
  );
}
