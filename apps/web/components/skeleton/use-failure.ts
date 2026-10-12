import { useCallback, useState } from "react";

/**
 * Hands a failure that happened outside rendering (a server function called from a form) to the
 * route's error page: the page throws it on its next render.
 */
export function useFailure(): (error: unknown) => void {
  const [failure, setFailure] = useState<{ error: unknown } | null>(null);
  if (failure) throw failure.error;
  return useCallback((error: unknown) => setFailure({ error }), []);
}
