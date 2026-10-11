/**
 * Draws the home screen icons, the favicon and iOS's splash images: `apps/web/public/icons/`,
 * `apps/web/public/favicon.ico` and the list of splash images in
 * `apps/web/lib/app-splash.generated.ts`. Run by hand when the mark or a theme's colours change:
 * `pnpm app-icons`, then commit what changed. Needs ImageMagick (`magick`).
 *
 * The mark is the wordmark's initials, "Y/H" in Geist Mono Bold between two ledger rules, in
 * the theme's ink on the theme's page. ImageMagick draws it once per theme from the font file;
 * `@vite-pwa/assets-generator` makes every size from that: the plain and maskable icons Chrome
 * asks for, Apple's touch icon, and a splash image per iPhone screen in each theme (iOS takes no
 * splash from the manifest, only an image of the screen's exact size).
 */
import { spawnSync } from "node:child_process";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { instructions } from "@vite-pwa/assets-generator/api/instructions";
import {
  AllAppleDeviceNames,
  createAppleSplashScreens,
  minimal2023Preset,
} from "@vite-pwa/assets-generator/config";
import sharp from "sharp";
import { ICON_SIZES, ICONS_PATH, INK_COLORS, THEME_COLORS } from "../apps/web/lib/install.ts";

const PUBLIC = new URL("../apps/web/public/", import.meta.url);
const OUT = new URL(`.${ICONS_PATH}`, PUBLIC);
const SPLASH_LIST = new URL("../apps/web/lib/app-splash.generated.ts", import.meta.url);
const FONT = fileURLToPath(
  new URL("../node_modules/geist/dist/fonts/geist-mono/GeistMono-Bold.ttf", import.meta.url),
);

/** The mark's square, and within it the width of the letters and the rules' weight and gap. */
const SIZE = 1024;
const LETTERS = 920;
const RULE = 44;
const GAP = 96;
/** `favicon.ico` is one image of this size; the tab strip draws it at 16 or 32. */
const FAVICON_SIZE = 48;

function magick(args: string[], input?: Buffer): Buffer {
  const run = spawnSync("magick", args, { input, maxBuffer: 64 * 1024 * 1024 });
  if (run.status !== 0) throw new Error(`magick failed: ${run.stderr?.toString() ?? run.error}`);
  return run.stdout;
}

/** The mark in one ink on nothing: the letters across the square, a rule above and below. */
function mark(ink: string): Buffer {
  const letters = magick([
    ...["-background", "none", "-fill", ink, "-font", FONT, "-pointsize", "600"],
    "label:Y/H",
    ...["-trim", "+repage", "-resize", `${LETTERS}x`, "png:-"],
  ]);
  const height = Number(magick(["png:-", "-format", "%h", "info:"], letters).toString());
  const top = Math.round((SIZE - height) / 2) - GAP - RULE;
  const bottom = Math.round((SIZE + height) / 2) + GAP;
  const rule = (y: number) => `rectangle 0,${y} ${SIZE - 1},${y + RULE - 1}`;
  return magick(
    [
      ...["-size", `${SIZE}x${SIZE}`, "xc:none", "png:-", "-gravity", "center", "-composite"],
      ...["-fill", ink, "-draw", rule(top), "-draw", rule(bottom), "png:-"],
    ],
    letters,
  );
}

const light = mark(INK_COLORS.light);
const dark = mark(INK_COLORS.dark);
const paper = { fit: "contain", background: THEME_COLORS.light } as const;
// The generator hands over full colour; `finished` is the one place an image is reduced.
const untouched = { compressionLevel: 1, quality: 100, palette: false } as const;
// The first iPhone SE's screen is left out: it stopped at iOS 15, before a site on the home
// screen could do what this one is installed for.
const phones = AllAppleDeviceNames.filter(
  (name) => name.startsWith("iPhone") && name !== 'iPhone SE 4"',
);

const assets = await instructions({
  imageResolver: () => light,
  imageName: "mark.png",
  basePath: ICONS_PATH,
  htmlLinks: { xhtml: false, includeId: false },
  resolveSvgName: (name) => name,
  preset: {
    ...minimal2023Preset,
    png: untouched,
    // A maskable icon keeps the mark inside the middle that any launcher's mask leaves.
    transparent: { sizes: [FAVICON_SIZE, 64, ...ICON_SIZES], favicons: [], padding: 0.16 },
    maskable: { sizes: [...ICON_SIZES], padding: 0.36, resizeOptions: paper },
    apple: { sizes: [180], padding: 0.2, resizeOptions: paper },
    appleSplashScreens: createAppleSplashScreens(
      {
        padding: 0.72,
        resizeOptions: paper,
        darkResizeOptions: { fit: "contain", background: THEME_COLORS.dark },
        darkImageResolver: async () => dark,
        png: untouched,
        linkMediaOptions: { log: false, addMediaScreen: true, basePath: ICONS_PATH, xhtml: false },
      },
      phones,
    ),
  },
});

/**
 * An image as it is written: on its theme's page (the generator leaves a plain icon with no
 * background, which would be ink on whatever a launcher puts behind it) and in a small palette
 * without dithering, which is all two flat colours and their edges need.
 */
async function finished(image: Buffer, page: string): Promise<Buffer> {
  const flat = await sharp(image).flatten({ background: page }).png().toBuffer();
  // The generator's resizing leaves the margin around the mark a shade off the page (#f9f9f9 on
  // #fbfaf7), a faint box on a splash screen. Anything that close to the page is the page.
  const exact = magick(["png:-", "-fuzz", "2%", "-fill", page, "-opaque", page, "png:-"], flat);
  return sharp(exact)
    .png({ compressionLevel: 9, palette: true, colours: 32, dither: 0 })
    .toBuffer();
}

// Nothing on disk is touched until every image has been drawn.
const files: { name: string; body: Buffer }[] = [];
let favicon: Buffer | null = null;
for (const group of [assets.transparent, assets.maskable, assets.apple]) {
  for (const asset of Object.values(group)) {
    const body = await finished(await asset.buffer(), THEME_COLORS.light);
    if (group === assets.transparent && asset.width === FAVICON_SIZE) {
      favicon = magick(["png:-", "ico:-"], body);
    } else {
      files.push({ name: asset.name, body });
    }
  }
}
if (favicon == null) throw new Error("No favicon was drawn");
// The site is used upright on a phone, so only the portrait images are kept: a splash is a link
// in every page's head, and each one is weighed against that.
const splash: { url: string; media: string }[] = [];
for (const asset of Object.values(assets.appleSplashScreen)) {
  const media = asset.linkObject?.media;
  if (media == null || !media.includes("orientation: portrait")) continue;
  const isDark = media.includes("prefers-color-scheme: dark");
  const page = isDark ? THEME_COLORS.dark : THEME_COLORS.light;
  files.push({ name: asset.name, body: await finished(await asset.buffer(), page) });
  // The generator leaves the light image for any preference, so a dark phone would match two.
  splash.push({
    url: asset.url,
    media: isDark
      ? media
      : media.replace("screen and", "screen and (prefers-color-scheme: light) and"),
  });
}

await mkdir(OUT, { recursive: true });
for (const name of await readdir(OUT)) await rm(new URL(name, OUT));
for (const file of files) await writeFile(new URL(file.name, OUT), file.body);
await writeFile(new URL("favicon.ico", PUBLIC), favicon);

await writeFile(
  SPLASH_LIST,
  `// Written by scripts/app-icons.ts (\`pnpm app-icons\`). Do not edit.

/** iOS's splash images: one per iPhone screen and theme, each for exactly that screen. */
export const APPLE_SPLASH_IMAGES: readonly { url: string; media: string }[] = ${JSON.stringify(splash, null, 2)};
`,
);
const formatted = spawnSync(
  "pnpm",
  ["exec", "biome", "format", "--write", fileURLToPath(SPLASH_LIST)],
  { stdio: "inherit" },
);
if (formatted.status !== 0) throw new Error("Biome could not format the splash list");

const bytes = files.reduce((sum, file) => sum + file.body.length, 0);
console.log(
  `${files.length} images, ${Math.round(bytes / 1024)} KB, ${splash.length} of them splash images`,
);
