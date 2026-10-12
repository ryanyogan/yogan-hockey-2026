const memos = new WeakMap<object, Map<string, Promise<unknown>>>();

/**
 * A read that vinext's metadata, layout and page each asked for, which shared one answer a
 * request. Under TanStack Start a page's reads are one server function's, called once by its
 * loader, so there is nobody to share with and `read` is simply called. It is kept for the reads
 * whose routes are still to be ported (#188 to #192), which drop it as they go.
 *
 * `key` names the read and its arguments ("team:21").
 */
export function perRequest<T>(_key: string, read: () => Promise<T>): Promise<T> {
  return read();
}

/** `perRequest` with the request's identity handed in, which is what its tests do. */
export function memoFor<T>(
  request: object | null | undefined,
  key: string,
  read: () => Promise<T>,
): Promise<T> {
  if (request == null) return read();
  let memo = memos.get(request);
  if (memo == null) {
    memo = new Map();
    memos.set(request, memo);
  }
  const known = memo.get(key);
  if (known != null) return known as Promise<T>;
  const reading = read();
  memo.set(key, reading);
  return reading;
}
