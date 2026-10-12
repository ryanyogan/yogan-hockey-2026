import { type BrowserContext, test as base, expect, type Page } from "@playwright/test";
import { pageHydrated as everyControlIsReacts } from "../scripts/performance/hydration.ts";

export { expect };

/**
 * What React says when the HTML the server sent is not what the browser first rendered, in a dev
 * build (sentences) and in a production one (the codes of the same errors).
 */
const HYDRATION_ERROR = /hydrat|Minified React error #(418|419|421|422|423|425)\b/i;

/**
 * Every spec's `test`: a test fails if React reports a hydration error, whether logged (a dev
 * build logs an attribute that differs and carries on) or thrown, on any page it opens: the
 * `page` it is handed, and the pages of a context it makes itself with `browser.newContext`.
 */
export const test = base.extend<{ hydrationErrors: string[] }>({
  hydrationErrors: [
    async ({ browser, context }, use) => {
      const errors: string[] = [];
      const watch = (watched: BrowserContext) => {
        watched.on("console", (message) => {
          if (message.type() === "error" && HYDRATION_ERROR.test(message.text()))
            errors.push(`${message.page()?.url()}\n${message.text()}`);
        });
        watched.on("weberror", (thrown) => {
          const error = String(thrown.error());
          if (HYDRATION_ERROR.test(error)) errors.push(`${thrown.page()?.url()}\n${error}`);
        });
        return watched;
      };
      watch(context);
      // The browser is the worker's, shared by its tests: it makes watched contexts for this one.
      const newContext = browser.newContext;
      browser.newContext = async (options) => watch(await newContext.call(browser, options));
      await use(errors);
      browser.newContext = newContext;
      expect(errors, "React reported a hydration error").toEqual([]);
    },
    { auto: true },
  ],
});

/**
 * Waits until the shell has hydrated (`useHydratedMark` in `apps/web/src/routes/__root.tsx`): from
 * then on a link in the masthead is the router's. A link pressed before that loads a new
 * document, and what a test wrote into the page is gone with the old one.
 *
 * The page under the masthead hydrates a moment later (the build notes, #203). A link followed
 * in between makes React report a hydration error, so a test that loads a route's page and then
 * follows a link first waits for `pageHydrated`. The not-found page of an address no route
 * answers is the shell's own and has hydrated with it.
 */
export async function shellHydrated(page: Page): Promise<void> {
  await page.waitForFunction(
    () => (window as { __APP_HYDRATED?: boolean }).__APP_HYDRATED === true,
  );
}

/**
 * Waits until the page under the masthead has hydrated as well: every link, button and field
 * drawn is React's (`scripts/performance/hydration.ts`, which says why that is the test).
 */
export async function pageHydrated(page: Page): Promise<void> {
  await page.waitForFunction(everyControlIsReacts);
}
