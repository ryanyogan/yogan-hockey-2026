import { beforeEach, expect, test, vi } from "vitest";

// The site and the Agents' routing are stood in for: what is tested is what the Worker's entry
// answers itself and what it asks the site for.
const site = vi.hoisted(() => ({
  fetch: vi.fn(async (_request: Request) => new Response("the site")),
}));
vi.mock("@tanstack/react-start/server-entry", () => ({ default: site }));
vi.mock("agents", async (actual) => ({
  ...(await actual<typeof import("agents")>()),
  routeAgentRequest: vi.fn(async () => null),
}));

// Waking the Writer is the Agents' business (`agents/wake-writer.test.ts`); here it is only seen.
const wakeWriterOnce = vi.hoisted(() => vi.fn());
vi.mock("../agents/wake-writer", () => ({ wakeWriterOnce }));

const { default: worker } = await import("../worker");

type Asked = Parameters<typeof worker.fetch>[0];
const CTX = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext;
const ask = (path: string, method = "GET") =>
  worker.fetch(new Request(`https://hockey.test${path}`, { method }) as Asked, {} as Env, CTX);
/** The address the site was asked for, or null when the entry answered by itself. */
const askedOfSite = () => site.fetch.mock.calls.at(-1)?.[0].url ?? null;

beforeEach(() => vi.clearAllMocks());

test("an address ending in a slash is a 308 to the one without it, whatever the method", async () => {
  for (const [path, method, location] of [
    ["/nhl/", "GET", "/nhl"],
    ["/picks/", "GET", "/picks"],
    ["/nhl/?x=1", "HEAD", "/nhl?x=1"],
    ["/nhl/", "POST", "/nhl"],
    // The slash goes first, and the old link is answered at the address that leaves.
    ["/nhl/teams/21/?tab=roster", "GET", "/nhl/teams/21?tab=roster"],
  ] as const) {
    const answer = await ask(path, method);
    expect(answer.status, path).toBe(308);
    expect(answer.headers.get("location"), path).toBe(`https://hockey.test${location}`);
  }
  expect(askedOfSite()).toBeNull();
});

test("an old link is still a 308, and a socket's address is never the site's", async () => {
  const old = await ask("/nhl/teams/21?tab=roster");
  expect(old.status).toBe(308);
  expect(old.headers.get("location")).toBe("https://hockey.test/nhl/teams/21/roster?tab=roster");
  expect((await ask("/agents/")).status).toBe(404);
  expect(askedOfSite()).toBeNull();
});

test("the site is asked for an address as it came, but for one ending in a space", async () => {
  for (const path of [
    "/",
    "/nhl",
    "/NHL",
    "/nhl/teams/21",
    "/nhl/teams/%20/roster",
    "/picks?x=1",
  ]) {
    await ask(path);
    expect(askedOfSite()).toBe(`https://hockey.test${path}`);
  }
  await ask("/nhl/teams/%20");
  expect(askedOfSite()).toBe("https://hockey.test/nhl/teams/%20/");
});

test("every request offers to wake the Writer, and waits for nothing", async () => {
  await ask("/nhl");
  await ask("/agents/scoreboard-agent/main");

  expect(wakeWriterOnce.mock.calls).toEqual([[CTX], [CTX]]);
});
