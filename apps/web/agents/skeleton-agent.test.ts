import { applyD1Migrations } from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import { createDb, latestSkeletonBumps } from "@yogan-hockey/db";
import { getAgentByName } from "agents";
import { beforeAll, expect, test } from "vitest";
import { cachedSkeletonReading } from "../lib/skeleton";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

test("a bump moves the pulse on, records it in D1 and invalidates the cached reading", async () => {
  const agent = await getAgentByName(exports.SkeletonAgent, "bump");
  const cachedBefore = await cachedSkeletonReading();
  expect(await cachedSkeletonReading()).toEqual(cachedBefore);

  const pulse = await agent.bump();

  expect(pulse.count).toBe(1);
  expect(await agent.getPulse()).toEqual(pulse);
  expect(await latestSkeletonBumps(createDb(env.DB), 5)).toMatchObject([
    { count: 1, bumpedAt: pulse.lastBumpAt },
  ]);
  expect((await cachedSkeletonReading()).serial).not.toBe(cachedBefore.serial);
});
