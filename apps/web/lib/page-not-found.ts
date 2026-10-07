import { notFound } from "next/navigation";
import { doNotKeepPage } from "./render-failure";

/**
 * `notFound()` for a page the page cache keeps (`lib/page-cache.ts`). Beneath a `loading.tsx`
 * the not-found page streams inside a 200 (a team's three pages: the shell has gone by the time
 * the team is known to be missing), and a 200 is what the cache stores, so the render says not
 * to keep it. Where the status is still to be decided the answer is a 404 and is not stored
 * anyway.
 */
export function pageNotFound(): never {
  doNotKeepPage();
  notFound();
}
