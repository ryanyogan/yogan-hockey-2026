import type { MetadataRoute } from "next";

/**
 * What a phone needs to put the site on its home screen: the manifest, and the colour of the
 * browser's own bars. The icons and splash images are files in `public/icons/`, drawn by
 * `scripts/app-icons.ts`, which reads the names and colours here.
 */

export const APP_NAME = "Yogan Hockey";
/** The label under the home screen icon: iOS cuts a longer one short. */
export const APP_SHORT_NAME = "Hockey";

/** Each theme's page background (`--background` in the UI package's `theme.css`). */
export const THEME_COLORS = { light: "#fbfaf7", dark: "#0f172a" } as const;
/** The ink of each theme (`--foreground`), which the mark is drawn in. */
export const INK_COLORS = { light: "#171717", dark: "#f1f5f9" } as const;

export type ShownTheme = keyof typeof THEME_COLORS;

/** Where the generated icons and splash images are served from. */
export const ICONS_PATH = "/icons/";
/** The sizes Chrome asks of an installable site, each drawn plain and maskable. */
export const ICON_SIZES = [192, 512] as const;
export const APPLE_ICON = `${ICONS_PATH}apple-touch-icon-180x180.png`;
export const FAVICON_PNG = `${ICONS_PATH}pwa-64x64.png`;

export function webAppManifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description: "NHL scores, standings, teams and players.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // A manifest holds one colour each, so the splash and the task switcher are the paper theme.
    // The bars of the running app follow the theme shown: see `shownThemeColors`.
    background_color: THEME_COLORS.light,
    theme_color: THEME_COLORS.light,
    icons: ICON_SIZES.flatMap((size) => [
      {
        src: `${ICONS_PATH}pwa-${size}x${size}.png`,
        sizes: `${size}x${size}`,
        type: "image/png",
        purpose: "any" as const,
      },
      {
        src: `${ICONS_PATH}maskable-icon-${size}x${size}.png`,
        sizes: `${size}x${size}`,
        type: "image/png",
        purpose: "maskable" as const,
      },
    ]),
  };
}

/**
 * The `theme-color` for each of the operating system's two preferences. Until the browser knows
 * which theme the page shows (the server never does) each preference gets its own theme, which is
 * what the page shows for a visitor who has not chosen. Once it is known, both get that theme's,
 * so the bars match the page for a visitor whose choice differs from the operating system's.
 */
export function shownThemeColors(shown: ShownTheme | undefined): Record<ShownTheme, string> {
  if (shown == null) return { ...THEME_COLORS };
  return { light: THEME_COLORS[shown], dark: THEME_COLORS[shown] };
}
