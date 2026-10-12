import { isNotFound } from "@tanstack/react-router";
import { noteRenderFailure } from "../../lib/render-failure";

/**
 * Runs a page's read inside its server function, and says what a failure of it makes the page's
 * status (`lib/render-failure.ts`): 503 when ESPN did not answer, 500 for a fault of the site's.
 * A page that does not exist is neither: its 404 is the router's.
 */
export async function pageRead<Read>(read: () => Promise<Read>): Promise<Read> {
  try {
    return await read();
  } catch (error) {
    if (!isNotFound(error)) noteRenderFailure(error);
    throw error;
  }
}
