"use client";

import { useEffect, useState } from "react";
import { DROP_WAIT_MS, watchForDrop } from "./connection-drop";

/**
 * Whether a socket has been down for longer than a blip. Hand `opened` and `closed` to
 * `useAgent` as its `onOpen` and `onClose`; `dropped` turns true once the socket has stayed down
 * for `DROP_WAIT_MS` and false when it opens again.
 */
export function useDropWatch(): { dropped: boolean; opened: () => void; closed: () => void } {
  const [dropped, setDropped] = useState(false);
  const [watch] = useState(() => watchForDrop(DROP_WAIT_MS, setDropped));
  useEffect(() => watch.stop, [watch]);
  return { dropped, opened: watch.opened, closed: watch.closed };
}
