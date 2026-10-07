import { getRequestExecutionContext } from "vinext/shims/request-context";

const memos = new WeakMap<object, Map<string, Promise<unknown>>>();

/**
 * One read a request, whoever asks: `generateMetadata`, a layout and a page each asking for the
 * same thing share the first one's promise, its failure included. React's `cache()` does not do
 * this in vinext (each of the three has its own); the request's execution context, which vinext
 * holds for the length of a request, is one object for all of them.
 *
 * `key` names the read and its arguments ("team:21"). Outside a request (an Agent, a test) there
 * is nothing to share with and `read` is simply called.
 */
export function perRequest<T>(key: string, read: () => Promise<T>): Promise<T> {
  return memoFor(getRequestExecutionContext(), key, read);
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
