// Checks that the site can be installed to a home screen, as far as a desktop Chromium can say,
// and shoots the shell as an installed site would draw it on a phone with a notch and a home bar.
// Usage: node scripts/install-check.mjs [baseURL] [outDir]
// Writes <outDir>/report.json and the shots, and exits 1 when a check fails.
//
// Installability is Chrome's own verdict over the DevTools protocol (`Page.getAppManifest`,
// `Page.getInstallabilityErrors`): what Lighthouse's "installable-manifest" audit reported
// before Lighthouse 12 dropped its PWA category. It needs the full Chromium in a profile of its
// own (`pnpm exec playwright install chromium`): the headless shell Playwright uses by default
// answers "no errors" for any page at all, and an incognito context is refused for being one. So
// the same question is put to a page with no manifest first, which must be refused, or the
// answer for the site means nothing. The phone is emulated with
// `Emulation.setSafeAreaInsetsOverride`: an iPhone's 47px status bar and
// 34px home bar. Chromium draws neither, so each shot has them hatched in.
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { THEME_COLORS } from "../apps/web/lib/install.ts";

const [base = "http://localhost:5173", out = "docs/design/install"] = process.argv.slice(2);
const INSETS = { top: 47, right: 0, bottom: 34, left: 0 };
const PHONE = { width: 390, height: 844 };
// The same phone on its side: the notch at one end, and wide enough for the sidebar.
const SIDEWAYS = { width: 844, height: 390 };
const SIDEWAYS_INSETS = { top: 0, right: 47, bottom: 21, left: 47 };

await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const failures = [];
const check = (name, ok, detail) => {
  if (!ok) failures.push({ name, detail });
  return ok;
};

/** What Chrome makes of the manifest, and every file the manifest and the head name. */
async function installability() {
  const profile = await mkdtemp(join(tmpdir(), "install-check-"));
  const context = await chromium.launchPersistentContext(profile, {
    channel: "chromium",
    viewport: PHONE,
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  // The control: one of the site's own images, which is a page with no manifest.
  await page.goto(new URL("/favicon.ico", base).href, { waitUntil: "load" });
  const control = (await cdp.send("Page.getInstallabilityErrors")).installabilityErrors;
  check(
    "Chrome refuses a page with no manifest (the check can fail)",
    control.some((error) => error.errorId === "no-manifest"),
    control,
  );
  await page.goto(base, { waitUntil: "networkidle" });
  const manifest = await cdp.send("Page.getAppManifest");
  const { installabilityErrors } = await cdp.send("Page.getInstallabilityErrors");
  const parsed = JSON.parse(manifest.data ?? "{}");
  check(
    "the page links a manifest Chrome can read",
    manifest.url !== "" && manifest.data,
    manifest,
  );
  check("Chrome finds no manifest errors", manifest.errors.length === 0, manifest.errors);
  check("Chrome finds no installability errors", installabilityErrors.length === 0, {
    installabilityErrors,
  });

  const linked = await page.evaluate(() =>
    [...document.querySelectorAll('link[rel="icon"], link[rel^="apple-touch"]')].map((link) => ({
      rel: link.rel,
      href: link.getAttribute("href"),
    })),
  );
  const files = [];
  for (const { rel, href } of [
    { rel: "manifest", href: new URL(manifest.url).pathname },
    // An old link's query, which the Worker redirects on a page: the manifest must not move.
    { rel: "manifest", href: `${new URL(manifest.url).pathname}?tab=scoring` },
    ...(parsed.icons ?? []).map((icon) => ({
      rel: `manifest icon ${icon.purpose}`,
      href: icon.src,
    })),
    ...linked,
  ]) {
    const response = await context.request.get(new URL(href, base).href, { maxRedirects: 0 });
    const headers = response.headers();
    const file = {
      rel,
      href,
      status: response.status(),
      contentType: headers["content-type"],
      cacheControl: headers["cache-control"],
      pageCache: headers["x-page-cache"] ?? null,
      bytes: (await response.body()).length,
    };
    files.push(file);
    const type = rel === "manifest" ? "application/manifest+json" : "image/";
    check(
      `${href} is served as ${type}`,
      file.status === 200 && file.contentType?.startsWith(type),
      file,
    );
  }
  const head = await page.evaluate(() =>
    Object.fromEntries(
      [...document.head.querySelectorAll("meta[name]")]
        .filter((meta) => /viewport|web-app|application-name/.test(meta.name))
        .map((meta) => [meta.name, meta.content]),
    ),
  );
  check("the viewport covers the screen", head.viewport?.includes("viewport-fit=cover"), head);
  await context.close();
  await rm(profile, { recursive: true, force: true });
  return {
    controlWithoutManifest: control,
    manifestUrl: manifest.url,
    manifestErrors: manifest.errors,
    installabilityErrors,
    manifest: parsed,
    head,
    files,
  };
}

/** The shell in an installed site on a phone, in one theme, the operating system in the other. */
async function standalone(theme) {
  const os = theme === "dark" ? "light" : "dark";
  // No colour scheme through Playwright: its own media emulation would replace the one below.
  const context = await browser.newContext({ viewport: PHONE, colorScheme: null, hasTouch: true });
  const page = await context.newPage();
  // The visitor chose the theme the operating system does not prefer: the hard case for the bars.
  await page.addInitScript((chosen) => localStorage.setItem("theme", chosen), theme);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-color-scheme", value: os }],
  });
  await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: INSETS });
  await page.goto(base, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.locator(`html.${theme}`).waitFor();
  // Hydration is what tells the bars which theme is shown.
  await page.waitForFunction(
    (color) =>
      [...document.querySelectorAll('meta[name="theme-color"]')].every((m) => m.content === color),
    THEME_COLORS[theme],
  );

  // Where the hardware is, hatched over the page: nothing to read or press may be under it.
  await page.evaluate(({ top, bottom }) => {
    for (const [edge, size] of [
      ["top", top],
      ["bottom", bottom],
    ]) {
      const bar = document.createElement("div");
      bar.dataset.simulated = edge;
      bar.style.cssText = `position:fixed;left:0;right:0;${edge}:0;height:${size}px;z-index:9999;pointer-events:none;background:repeating-linear-gradient(45deg,rgba(220,38,38,.28) 0 6px,transparent 6px 12px);outline:1px dashed rgba(220,38,38,.8)`;
      document.body.append(bar);
    }
  }, INSETS);

  const measure = () =>
    page.evaluate(() => {
      const box = (node) => {
        // The text or control itself, not the padded box around it.
        const range = document.createRange();
        range.selectNodeContents(node);
        const { top, bottom } = range.getBoundingClientRect();
        return { top: Math.round(top * 10) / 10, bottom: Math.round(bottom * 10) / 10 };
      };
      const header = document.querySelector("header");
      const footer = document.querySelector("footer");
      return {
        osPrefersDark: matchMedia("(prefers-color-scheme: dark)").matches,
        insetTop: getComputedStyle(document.documentElement).getPropertyValue("--safe-top"),
        headerBox: header.getBoundingClientRect().toJSON(),
        headerContent: [...header.querySelectorAll("a, button")].map(box),
        footerContent: box(footer),
        viewportHeight: innerHeight,
        sideways: document.documentElement.scrollWidth > innerWidth,
        themeColor: [...document.querySelectorAll('meta[name="theme-color"]')].map(
          (m) => m.content,
        ),
        background: getComputedStyle(document.body).backgroundColor,
      };
    });

  const top = await measure();
  await page.screenshot({ path: `${out}/standalone-${theme}-390-top.png` });
  check(`${theme}: the operating system prefers ${os}`, top.osPrefersDark === (os === "dark"), top);
  check(
    `${theme}: the top bar's wordmark and buttons clear the status bar`,
    top.headerContent.every((item) => item.top >= INSETS.top),
    top.headerContent,
  );
  check(
    `${theme}: the top bar's own background reaches the top edge`,
    top.headerBox.top === 0 && top.headerBox.height === 44 + INSETS.top,
    top.headerBox,
  );
  check(`${theme}: the page does not scroll sideways`, !top.sideways, top);
  check(
    `${theme}: the bars' colour is the page shown, not the operating system's`,
    top.themeColor.length === 2 && top.themeColor.every((color) => color === THEME_COLORS[theme]),
    top.themeColor,
  );

  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  await menu.waitFor();
  const menuTop = (await menu.boundingBox()).y;
  check(`${theme}: the menu opens under the top bar`, menuTop === 44 + INSETS.top, { menuTop });
  await page.screenshot({ path: `${out}/standalone-${theme}-390-menu.png` });
  await page.keyboard.press("Escape");

  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  const bottom = await measure();
  check(
    `${theme}: the footer's last line clears the home bar`,
    bottom.footerContent.bottom <= bottom.viewportHeight - INSETS.bottom,
    bottom.footerContent,
  );
  await page.screenshot({ path: `${out}/standalone-${theme}-390-bottom.png` });
  await context.close();
  return { operatingSystem: os, top, menuTop, bottom };
}

/** The shell with the phone on its side: the sidebar beside the notch, the page beside the other end. */
async function sideways() {
  const context = await browser.newContext({ viewport: SIDEWAYS, colorScheme: "light" });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: SIDEWAYS_INSETS });
  await page.goto(base, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(({ left, right, bottom }) => {
    for (const [edge, size] of [
      ["left", left],
      ["right", right],
      ["bottom", bottom],
    ]) {
      const bar = document.createElement("div");
      const across = edge === "bottom" ? "left:0;right:0;height" : "top:0;bottom:0;width";
      bar.style.cssText = `position:fixed;${edge}:0;${across}:${size}px;z-index:9999;pointer-events:none;background:repeating-linear-gradient(45deg,rgba(220,38,38,.28) 0 6px,transparent 6px 12px);outline:1px dashed rgba(220,38,38,.8)`;
      document.body.append(bar);
    }
  }, SIDEWAYS_INSETS);
  const measured = await page.evaluate(() => {
    const text = (node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      const { left, right, bottom } = range.getBoundingClientRect();
      return { left, right, bottom };
    };
    const aside = document.querySelector("aside");
    const column = [...document.querySelectorAll("main > *, [data-slot=score-ticker] > *")];
    return {
      sidebarShown: getComputedStyle(aside).display !== "none",
      sidebarLeft: Math.min(...[...aside.querySelectorAll("a, button")].map((n) => text(n).left)),
      sidebarBottom: Math.max(
        ...[...aside.querySelectorAll("a, button")].map((n) => text(n).bottom),
      ),
      // The boxes inside the padded column, and the footer by its text: its own box is the padding.
      columnRight: Math.max(
        text(document.querySelector("footer")).right,
        ...column.map((node) => node.getBoundingClientRect().right),
      ),
      sidewaysScroll: document.documentElement.scrollWidth > innerWidth,
    };
  });
  const { left, right, bottom } = SIDEWAYS_INSETS;
  check("sideways: the sidebar is shown", measured.sidebarShown, measured);
  check("sideways: the sidebar's links clear the notch", measured.sidebarLeft >= left, measured);
  check(
    "sideways: the sidebar's theme switch clears the home bar",
    measured.sidebarBottom <= SIDEWAYS.height - bottom,
    measured,
  );
  check(
    "sideways: the ticker, the page and the footer clear the far end",
    measured.columnRight <= SIDEWAYS.width - right,
    measured,
  );
  check("sideways: the page does not scroll sideways", !measured.sidewaysScroll, measured);
  await page.screenshot({ path: `${out}/sideways-light-844.png` });
  await context.close();
  return { simulatedInsets: SIDEWAYS_INSETS, ...measured };
}

const report = {
  base,
  checkedAt: new Date().toISOString(),
  chromium: browser.version(),
  simulatedInsets: INSETS,
  installability: await installability(),
  standalone: { light: await standalone("light"), dark: await standalone("dark") },
  sideways: await sideways(),
  failures,
};
await browser.close();
await writeFile(`${out}/report.json`, `${JSON.stringify(report, null, 2)}\n`);
// Biome checks the JSON under docs/ too.
spawnSync("pnpm", ["exec", "biome", "format", "--write", `${out}/report.json`]);
console.log(
  `installability errors: ${JSON.stringify(report.installability.installabilityErrors)}; ` +
    `${report.installability.files.length} files fetched; ${failures.length} failed checks`,
);
for (const failure of failures)
  console.error("FAILED", failure.name, JSON.stringify(failure.detail));
process.exit(failures.length === 0 ? 0 : 1);
