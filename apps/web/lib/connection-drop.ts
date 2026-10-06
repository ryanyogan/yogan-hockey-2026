/** How long a socket may be down before the page says so: a reconnect is usually quicker. */
export const DROP_WAIT_MS = 4000;

/** What a page says while a socket it follows is down. */
export const RECONNECTING = "Reconnecting";

export type DropWatch = {
  /** The socket opened. */
  opened: () => void;
  /** The socket closed, or an attempt to open it failed. */
  closed: () => void;
  /** Forget the pending wait; nothing more is reported. */
  stop: () => void;
};

/**
 * Tells a blip from a drop. `onChange(true)` once the socket has been down for `waitMs` without
 * opening, counted from the first close (each failed attempt to reconnect closes again), and
 * `onChange(false)` when it next opens. A drop that ends sooner is never reported.
 */
export function watchForDrop(waitMs: number, onChange: (dropped: boolean) => void): DropWatch {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let dropped = false;
  const stop = () => {
    if (timer != null) clearTimeout(timer);
    timer = null;
  };
  return {
    opened() {
      stop();
      if (dropped) onChange(false);
      dropped = false;
    },
    closed() {
      if (dropped || timer != null) return;
      timer = setTimeout(() => {
        timer = null;
        dropped = true;
        onChange(true);
      }, waitMs);
    },
    stop,
  };
}
