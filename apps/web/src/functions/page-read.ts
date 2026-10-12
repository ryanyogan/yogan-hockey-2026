import { isNotFound } from "@tanstack/react-router";
import { noteRenderFailure } from "../../lib/render-failure";

/** All a browser is told of a read that failed. The error page has its own words for it. */
const UNREAD = "The page could not be read";

/**
 * Runs a page's read inside its server function, and says what a failure of it makes the page's
 * status (`lib/render-failure.ts`): 503 when ESPN did not answer, 500 for a fault of the site's.
 * A page that does not exist is neither: its 404 is the router's.
 *
 * What is thrown on is not the failure itself. The router writes a loader's error into the
 * page's HTML for the browser to pick up, and answers a navigation's server function with it,
 * message and all, and a message can carry an ESPN address. So the failure is logged here, where
 * the Worker's logs keep it, and the browser gets a sentence that says nothing.
 */
export async function pageRead<Read>(read: () => Promise<Read>): Promise<Read> {
  try {
    return await read();
  } catch (error) {
    if (isNotFound(error)) throw error;
    noteRenderFailure(error);
    console.error("A page's read failed", error);
    throw new Error(UNREAD);
  }
}
