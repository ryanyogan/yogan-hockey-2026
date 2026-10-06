import { describe, expect, test, vi } from "vitest";
import { endpoints } from "../src/endpoints.ts";
import { loadFixture } from "../src/fixtures.ts";
import { describeCheck, runLiveCheck } from "./live-check.ts";
import { SAMPLES, unfinishedSummaries } from "./samples.ts";

/** The first scheduled game on the recorded slate; its pre-game summary is not the recorded one. */
const FIRST_SCHEDULED = endpoints.summary("401891815");
/** The recorded pre-game summary, standing in for whichever scheduled game the check picks. */
const PREGAME = endpoints.summary("401892449");

/** ESPN as recorded: every request answered from `fixtures/`, unless `answers` says otherwise. */
async function recordedEspn(
  answers: Record<string, (attempt: number) => Response | Promise<Response>> = {},
) {
  const recorded = new Map<string, string>();
  for (const { endpoint } of SAMPLES) {
    recorded.set(endpoint.url, JSON.stringify(await loadFixture(endpoint)));
  }
  recorded.set(FIRST_SCHEDULED.url, JSON.stringify(await loadFixture(PREGAME)));
  const attempts = new Map<string, number>();
  const fetcher = vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    const attempt = (attempts.get(url) ?? 0) + 1;
    attempts.set(url, attempt);
    const answer = answers[url];
    if (answer) return answer(attempt);
    const body = recorded.get(url);
    return body === undefined ? new Response("no such thing", { status: 404 }) : new Response(body);
  });
  return { fetcher, recorded };
}

const sleep = vi.fn(async () => {});
const now = () => new Date("2026-10-06T16:17:00Z");

function check(fetcher: typeof fetch) {
  return runLiveCheck({ fetch: fetcher, sleep, now });
}

/** A recorded response with one change made to it. */
// biome-ignore lint/suspicious/noExplicitAny: ESPN's own JSON, reached into by hand to break it.
function changed(body: string | undefined, change: (response: any) => void): () => Response {
  const response = JSON.parse(body ?? "null");
  change(response);
  return () => new Response(JSON.stringify(response));
}

describe("the daily live check", () => {
  test("passes when every response is the shape the site reads", async () => {
    const { fetcher } = await recordedEspn();

    const summary = await check(fetcher);

    expect(summary.ok).toBe(true);
    expect(summary.checkedAt).toBe("2026-10-06T16:17:00.000Z");
    expect(summary.results.map((result) => `${result.outcome} ${result.endpoint}`)).toEqual([
      "ok scoreboard",
      "ok scoreboard?dates=20261003",
      "ok standings",
      "ok teams",
      "ok teams/21",
      "ok teams/21/schedule",
      "ok summary?event=401803652",
      "ok athletes/4024123",
      "ok athletes/3067313",
      "ok athletes/4024123/stats",
      "ok athletes/3067313/stats",
      "ok athletes/4024123/gamelog",
      "ok athletes/3067313/gamelog",
      "ok search",
      "ok summary?event=401891815",
    ]);
    // The recorded slate has no game under way, and the check says so rather than pass in silence.
    expect(summary.notChecked).toEqual(["the summary of a live game: none on today's slate"]);
  });

  test("a response that changed shape is a parse failure naming the endpoint and the path", async () => {
    const { recorded } = await recordedEspn();
    const { fetcher } = await recordedEspn({
      [endpoints.standings().url]: changed(recorded.get(endpoints.standings().url), (standings) => {
        standings.children[0].children[0].standings.entries[0].team.id = 21;
      }),
    });

    const summary = await check(fetcher);

    expect(summary.ok).toBe(false);
    const failures = summary.results.filter((result) => result.outcome !== "ok");
    expect(failures).toEqual([
      {
        endpoint: "standings",
        url: endpoints.standings().url,
        outcome: "parse-failure",
        attempts: 1,
        status: null,
        message: expect.stringContaining("ESPN standings did not parse"),
        issues: [
          expect.stringMatching(/^children\.0\.children\.0\.standings\.entries\.0\.team\.id: /),
        ],
      },
    ]);
  });

  test("reports every failure, not only the first, and still checks the rest", async () => {
    const { recorded } = await recordedEspn();
    const { fetcher } = await recordedEspn({
      [endpoints.teams().url]: changed(recorded.get(endpoints.teams().url), (teams) => {
        delete teams.sports;
      }),
      [endpoints.playerSearch("mar").url]: () => new Response("<html>Access denied</html>"),
    });

    const summary = await check(fetcher);

    expect(summary.results.filter((r) => r.outcome !== "ok").map((r) => r.endpoint)).toEqual([
      "teams",
      "search",
    ]);
    expect(summary.results).toHaveLength(15);
    expect(summary.results.find((r) => r.endpoint === "search")).toMatchObject({
      outcome: "parse-failure",
      issues: [],
    });
  });

  test("a failed fetch is tried three times before it is called a failure", async () => {
    const { fetcher } = await recordedEspn({
      [endpoints.teams().url]: () => new Response("busy", { status: 503 }),
      [endpoints.standings().url]: () => {
        throw new TypeError("fetch failed");
      },
    });
    sleep.mockClear();

    const summary = await check(fetcher);

    expect(summary.ok).toBe(false);
    expect(summary.results.filter((r) => r.outcome !== "ok")).toEqual([
      {
        endpoint: "standings",
        url: endpoints.standings().url,
        outcome: "fetch-failure",
        attempts: 3,
        status: null,
        message: "ESPN standings could not be fetched: no response",
        issues: [],
      },
      {
        endpoint: "teams",
        url: endpoints.teams().url,
        outcome: "fetch-failure",
        attempts: 3,
        status: 503,
        message: "ESPN teams could not be fetched: HTTP 503",
        issues: [],
      },
    ]);
    // Two waits for each of the two endpoints, the second longer than the first.
    expect(sleep.mock.calls).toEqual([[2000], [4000], [2000], [4000]]);
  });

  test("a fetch that works on a later try passes, and the tries are counted", async () => {
    const { recorded } = await recordedEspn();
    const { fetcher } = await recordedEspn({
      [endpoints.teams().url]: (attempt) =>
        attempt < 3
          ? new Response("busy", { status: 503 })
          : new Response(recorded.get(endpoints.teams().url)),
    });

    const summary = await check(fetcher);

    expect(summary.ok).toBe(true);
    expect(summary.results.find((r) => r.endpoint === "teams")).toMatchObject({
      outcome: "ok",
      attempts: 3,
    });
  });

  test("ESPN saying there is no such thing is an answer, and is not asked again", async () => {
    const { fetcher } = await recordedEspn({
      [endpoints.player("4024123").url]: () => new Response("gone", { status: 404 }),
    });

    const summary = await check(fetcher);

    expect(summary.results.find((r) => r.endpoint === "athletes/4024123")).toMatchObject({
      outcome: "fetch-failure",
      attempts: 1,
      status: 404,
    });
  });

  test("a career table that is a 404 fails here, though the site reads it as an empty table", async () => {
    const { fetcher } = await recordedEspn({
      [endpoints.playerCareer("4024123").url]: () => new Response("gone", { status: 404 }),
    });

    const summary = await check(fetcher);

    expect(summary.ok).toBe(false);
  });

  test("when today's slate does not parse, the summary it would have chosen is listed as not checked", async () => {
    const { fetcher } = await recordedEspn({
      [endpoints.scoreboard().url]: () => new Response(JSON.stringify({ events: "none" })),
    });

    const summary = await check(fetcher);

    expect(summary.results.filter((r) => r.outcome !== "ok").map((r) => r.endpoint)).toEqual([
      "scoreboard",
    ]);
    expect(summary.results).toHaveLength(14);
    expect(summary.notChecked).toEqual([
      "the summary of a live or scheduled game: today's scoreboard failed",
    ]);
  });
});

describe("choosing summaries from today's slate", () => {
  test("one live game and one scheduled game, live first", () => {
    const chosen = unfinishedSummaries([
      { id: "1", status: "final" },
      { id: "2", status: "scheduled" },
      { id: "3", status: "live" },
      { id: "4", status: "live" },
      { id: "5", status: "postponed" },
    ]);

    expect(chosen.map((sample) => sample.endpoint.name)).toEqual([
      "summary?event=3",
      "summary?event=2",
    ]);
  });

  test("none from a slate that is all finished", () => {
    expect(unfinishedSummaries([{ id: "1", status: "final" }])).toEqual([]);
  });
});

describe("the check's report", () => {
  test("says what passed", async () => {
    const { fetcher } = await recordedEspn();

    const report = describeCheck(await check(fetcher));

    expect(report).toContain("ok    scoreboard\n");
    expect(report).toContain("not checked: the summary of a live game: none on today's slate");
    expect(report.trimEnd().split("\n").at(-1)).toBe("ESPN check passed: 15 endpoints.");
  });

  test("says which endpoint failed, how, and where in the response", async () => {
    const { recorded } = await recordedEspn();
    const { fetcher } = await recordedEspn({
      [endpoints.teams().url]: changed(recorded.get(endpoints.teams().url), (teams) => {
        delete teams.sports;
      }),
      [endpoints.standings().url]: () => new Response("busy", { status: 503 }),
    });

    const report = describeCheck(await check(fetcher));

    expect(report).toContain("PARSE teams\n");
    expect(report).toContain("        sports: ");
    expect(report).toContain("FETCH standings\n");
    expect(report).toContain("ESPN standings could not be fetched: HTTP 503 (3 tries)");
    expect(report.trimEnd().split("\n").at(-1)).toBe(
      "ESPN check FAILED: 1 parse failure (ESPN changed shape), 1 fetch failure (ESPN or the network was down), of 15 endpoints.",
    );
  });
});
