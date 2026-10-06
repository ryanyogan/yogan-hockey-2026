import { noteRenderFailure } from "./lib/render-failure";

/**
 * vinext calls this for every render that fails (not for `notFound()` or a redirect). The page
 * `app/error.tsx` draws in its place is then answered with an error status: see
 * `lib/render-failure.ts`.
 */
export function onRequestError(error: unknown): void {
  noteRenderFailure(error);
}
