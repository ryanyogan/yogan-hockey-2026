import { describe, expect, it } from "vitest";
import { APPLE_SPLASH_IMAGES } from "./app-splash.generated";
import { APPLE_ICON, FAVICON_PNG, shownThemeColors, webAppManifest } from "./install";

describe("the web app manifest", () => {
  const manifest = webAppManifest();

  it("names the app, and the home screen label fits under an icon", () => {
    expect(manifest.name).toBe("Yogan Hockey");
    expect(manifest.short_name).toBe("Hockey");
  });

  it("opens the whole site at its home page, without browser bars", () => {
    expect(manifest).toMatchObject({ id: "/", start_url: "/", scope: "/", display: "standalone" });
  });

  it("has the two sizes Chrome asks for, each as a plain and a maskable icon", () => {
    const icons = (manifest.icons ?? []).map(
      (icon) => `${icon.sizes} ${icon.purpose} ${icon.type}`,
    );
    expect(icons.toSorted()).toEqual([
      "192x192 any image/png",
      "192x192 maskable image/png",
      "512x512 any image/png",
      "512x512 maskable image/png",
    ]);
    for (const icon of manifest.icons ?? []) expect(icon.src).toMatch(/^\/icons\/[\w-]+\.png$/);
  });

  it("paints the splash and the bars in the paper theme, the one colour a manifest can hold", () => {
    expect(manifest.background_color).toBe("#fbfaf7");
    expect(manifest.theme_color).toBe("#fbfaf7");
  });
});

describe("the drawn icons and splash images", () => {
  it("are the files the manifest and the page's head ask for, and no others", () => {
    // The tests run inside workerd, which has no disk: Vite lists the files as it builds the test.
    const found = Object.keys(import.meta.glob("../public/icons/*.png", { query: "?url" }));
    const drawn = found.map((path) => path.replace("../public", ""));
    const asked = [
      ...(webAppManifest().icons ?? []).map((icon) => icon.src),
      APPLE_ICON,
      FAVICON_PNG,
      ...APPLE_SPLASH_IMAGES.map((image) => image.url),
    ];
    expect(asked.toSorted()).toEqual(drawn.toSorted());
  });

  it("offer each iPhone screen one splash image per theme", () => {
    const screens = new Set(APPLE_SPLASH_IMAGES.map((image) => image.media));
    expect(screens.size).toBe(APPLE_SPLASH_IMAGES.length);
    const themes = APPLE_SPLASH_IMAGES.map(
      (image) => /prefers-color-scheme: (light|dark)/.exec(image.media)?.[1],
    );
    expect(themes.filter((theme) => theme === "light")).toHaveLength(12);
    expect(themes.filter((theme) => theme === "dark")).toHaveLength(12);
  });
});

// The two colours are the themes' page backgrounds; the shell's smoke test (e2e/shell.spec.ts)
// holds them against what the stylesheet draws.
describe("the colour of the browser's own bars", () => {
  it("follows the operating system until the theme shown is known", () => {
    expect(shownThemeColors(undefined)).toEqual({ light: "#fbfaf7", dark: "#0f172a" });
  });

  it("is the shown theme's whatever the operating system prefers", () => {
    expect(shownThemeColors("dark")).toEqual({ light: "#0f172a", dark: "#0f172a" });
    expect(shownThemeColors("light")).toEqual({ light: "#fbfaf7", dark: "#fbfaf7" });
  });
});
