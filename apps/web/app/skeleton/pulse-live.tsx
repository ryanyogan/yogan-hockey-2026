"use client";

import type { Pulse } from "@yogan-hockey/schemas";
import { Badge } from "@yogan-hockey/ui/components/badge";
import { useAgent } from "agents/react";
import { useState } from "react";

type SocketStatus = "connecting" | "open" | "closed";

export function PulseLive({ name, initial }: { name: string; initial: Pulse }) {
  const [pulse, setPulse] = useState(initial);
  const [pushes, setPushes] = useState(0);
  const [socket, setSocket] = useState<SocketStatus>("connecting");

  useAgent<Pulse>({
    agent: "skeleton-agent",
    name,
    onStateUpdate: (next) => {
      setPulse(next);
      setPushes((n) => n + 1);
    },
    onOpen: () => setSocket("open"),
    onClose: () => setSocket("closed"),
  });

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
      <dt className="text-foreground/60">Socket</dt>
      <dd>
        <Badge variant={socket === "open" ? "default" : "outline"} data-testid="socket">
          {socket}
        </Badge>
      </dd>
      <dt className="text-foreground/60">Count at first paint (RPC)</dt>
      <dd data-testid="pulse-initial">{initial.count}</dd>
      <dt className="text-foreground/60">Count now (pushed)</dt>
      <dd data-testid="pulse-count">{pulse.count}</dd>
      <dt className="text-foreground/60">Pushes received</dt>
      <dd data-testid="pulse-pushes">{pushes}</dd>
    </dl>
  );
}
