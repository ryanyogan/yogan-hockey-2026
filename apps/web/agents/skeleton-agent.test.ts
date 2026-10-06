import { applyD1Migrations } from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import createKvDataCache from "@vinext/cloudflare/cache/kv-data-adapter.runtime";
import { createDb, latestSkeletonBumps } from "@yogan-hockey/db";
import { getAgentByName } from "agents";
import { setDataCacheHandler } from "vinext/shims/cache-handler";
import { beforeAll, expect, test } from "vitest";
import { cachedSkeletonReading } from "../lib/skeleton";

beforeAll(async () => {
  // The site's entry registers the KV cache; this entry is the Agents alone, so the test does it.
  setDataCacheHandler(createKvDataCache({ env: { ...env }, options: undefined }));
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
  const { keys } = await env.VINEXT_KV_CACHE.list();
  expect(keys.map((key) => key.name)).toContain("__tag:skeleton");
});
