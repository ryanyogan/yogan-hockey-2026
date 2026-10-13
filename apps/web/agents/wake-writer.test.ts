import { exports } from "cloudflare:workers";
import { getAgentByName } from "agents";
import { expect, test, vi } from "vitest";
import { wakeWriterOnce } from "./wake-writer";
import { MORNING_CRON, NIGHT_CRON, WRITER_NAME } from "./writer-agent";

test("the first request of an isolate starts the Writer, which sets its schedules; later ones do nothing", async () => {
  const waited: Promise<unknown>[] = [];
  const ctx = { waitUntil: vi.fn((work: Promise<unknown>) => void waited.push(work)) };

  wakeWriterOnce(ctx);
  wakeWriterOnce(ctx);
  await Promise.all(waited);

  expect(ctx.waitUntil).toHaveBeenCalledTimes(1);
  const writer = await getAgentByName(exports.WriterAgent, WRITER_NAME);
  expect(await writer.wake()).toEqual(
    expect.arrayContaining([
      { callback: "morning", cron: MORNING_CRON },
      { callback: "night", cron: NIGHT_CRON },
    ]),
  );
});
