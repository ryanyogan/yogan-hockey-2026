/** How long one model call may take. A call that hangs would hold up every other timer. */
export const MODEL_CALL_TIMEOUT_MS = 90 * 1000;

/** A model call's answer, or a rejection when it takes longer than a call may. */
export async function withTimeout<T>(call: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error("The model call timed out")), MODEL_CALL_TIMEOUT_MS);
  });
  try {
    return await Promise.race([call, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
