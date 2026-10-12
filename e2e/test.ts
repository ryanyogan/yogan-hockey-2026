import { test as base, expect, type Page } from "@playwright/test";

export { expect };

/**
 * What React says when the HTML the server sent is not what the browser first rendered, in a dev
 * build (sentences) and in a production one (the codes of the same errors).
 */
const HYDRATION_ERROR = /hydrat|Minified React error #(418|419|421|422|423|425)\b/i;

/**
 * Every spec's `test`: a test of any page fails if React reports a hydration error on it, whether
 * logged (a dev build logs an attribute that differs and carries on) or thrown.
 */
export const test = base.extend<{ hydrationErrors: string[] }>({
  hydrationErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error" && HYDRATION_ERROR.test(message.text()))
          errors.push(`${page.url()}\n${message.text()}`);
      });
      page.on("pageerror", (error) => {
        if (HYDRATION_ERROR.test(String(error))) errors.push(`${page.url()}\n${error}`);
      });
      await use(errors);
      expect(errors, "React reported a hydration error").toEqual([]);
    },
    { auto: true },
  ],
});

/**
 * Waits until the shell has hydrated (`useHydratedMark` in `apps/web/src/routes/__root.tsx`): from
 * then on a link in the masthead is the router's. Before it a click on one loads a new document,
 * and what a test wrote into the page is gone with the old one.
 *
 * The page under the masthead hydrates a moment later, and a link followed in between has React
 * hydrate that page's HTML as the page gone to, which it reports. A test that follows a link
 * after loading a page that draws something of its own waits for that page to do what it only
 * does once hydrated (`e2e/players.spec.ts` waits for Favorites).
 */
export async function hydrated(page: Page): Promise<void> {
  await page.waitForFunction(
    () => (window as { __APP_HYDRATED?: boolean }).__APP_HYDRATED === true,
  );
}
