import { exports } from "cloudflare:workers";
import { getAgentByName } from "agents";
import { WRITER_NAME } from "./writer-agent";

/** True once this isolate has woken the Writer. A value, never a promise (build notes, #95). */
let woken = false;

/**
 * Wakes the Writer once per isolate, without holding up the request that does it: the Agent sets
 * its own schedules as it starts, and it starts when it is first called. After that its schedules
 * are in its storage and run with nobody on the site. A failure is logged and tried again by the
 * next request; it never reaches the page.
 */
export function wakeWriterOnce(ctx: Pick<ExecutionContext, "waitUntil">): void {
  if (woken) return;
  woken = true;
  ctx.waitUntil(
    (async () => {
      try {
        const writer = await getAgentByName(exports.WriterAgent, WRITER_NAME);
        await writer.wake();
      } catch (error) {
        woken = false;
        console.error("Writer: could not be woken", error);
      }
    })(),
  );
}
