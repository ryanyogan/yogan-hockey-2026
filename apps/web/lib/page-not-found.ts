import { notFound } from "@tanstack/react-router";

/**
 * The page asked for does not exist: thrown from a server function or a loader, it is answered
 * with a 404 and drawn by the root route's not-found page.
 */
export function pageNotFound(): never {
  throw notFound();
}
