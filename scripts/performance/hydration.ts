// When a page has hydrated, asked of the browser and not of the site, so that the answer means
// the same thing whichever framework drew the page.
//
// A site's own mark does not: vinext set `__NEXT_HYDRATED_AT` when its root had hydrated, and the
// TanStack Start site sets `__APP_HYDRATED_AT` from an effect of the root route, which runs when
// the shell has hydrated. Under Start the page beneath the masthead is inside the router's own
// `<Suspense>` and hydrates in a later pass (build notes, #203), so the site's mark is early by
// that much. What a visitor cares about is that every control drawn answers a tap, and React
// says so itself: it hangs its fiber on each element as it hydrates it (`__reactFiber$<key>`,
// since React 17). The page has hydrated when the document is whole and every link, button and
// field in it carries one.
//
// The watch looks once a frame, so its time is late by up to a frame (and by as long as the main
// thread stays busy after the commit, during which no tap is answered either). It is late alike
// on both sites. The site's own mark is kept beside it (`shellMs`).
import type { Page } from "@playwright/test";

/** Runs in the page: true once every control in the document is React's. */
export const pageHydrated = (): boolean => {
  // A document still arriving may have hydrated all it has so far.
  if (document.readyState === "loading") return false;
  const controls = document.querySelectorAll("a[href], button, input, select, textarea, summary");
  if (controls.length === 0) return false;
  for (const control of controls) {
    if (!Object.keys(control).some((key) => key.startsWith("__reactFiber$"))) return false;
  }
  return true;
};

type Watched = {
  __pageHydrated?: () => boolean;
  __PAGE_HYDRATED_AT?: number;
  __APP_HYDRATED_AT?: number;
  __NEXT_HYDRATED_AT?: number;
};

/** Runs before the page's own scripts: notes the first frame at which the page has hydrated. */
const watch = () => {
  const watched = window as unknown as Watched;
  const look = () => {
    if (watched.__pageHydrated?.()) {
      watched.__PAGE_HYDRATED_AT = performance.now();
      return;
    }
    requestAnimationFrame(look);
  };
  requestAnimationFrame(look);
};

/** Call before `page.goto`: every document the page loads is watched from its first frame. */
export async function watchHydration(page: Page): Promise<void> {
  await page.addInitScript(`window.__pageHydrated = ${pageHydrated.toString()};`);
  await page.addInitScript(watch);
}

/** Waits until the page loaded has hydrated: from then on every control drawn answers a tap. */
export async function untilPageHydrated(page: Page, timeout = 60_000): Promise<void> {
  await page.waitForFunction(
    () => (window as unknown as Watched).__PAGE_HYDRATED_AT != null,
    undefined,
    { timeout },
  );
}

export type HydrationMarks = {
  /** The watch's: every control is React's. Milliseconds from the navigation's start. */
  pageMs: number | null;
  /** The site's own mark: the shell under TanStack Start, the root under vinext. */
  shellMs: number | null;
};

/** Both marks of the page loaded. */
export function hydrationMarks(page: Page): Promise<HydrationMarks> {
  return page.evaluate(() => {
    const watched = window as unknown as Watched;
    return {
      pageMs: watched.__PAGE_HYDRATED_AT ?? null,
      shellMs: watched.__APP_HYDRATED_AT ?? watched.__NEXT_HYDRATED_AT ?? null,
    };
  });
}
