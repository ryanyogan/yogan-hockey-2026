import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { HomeNews } from "../components/dashboard/news";
import { cachedNews } from "./espn";
import { readHomeNews } from "./home-news";
import { forget } from "./kv-cache";

/** The news' key, as `espn.ts` has it. Nothing on the site forgets it, so the tests do. */
const NEWS_KEY = "espn-news";
const NEWS_URL = "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/news?limit=12";
const MINUTE = 60 * 1000;
const fetchMock = vi.fn<typeof fetch>();
const failures = vi.spyOn(console, "error").mockImplementation(() => {});

beforeEach(async () => {
  // ESPN is this mock: the recorded responses are not used, so each test says what ESPN answers.
  vi.stubEnv("ESPN_FIXTURES", "");
  vi.stubGlobal("fetch", fetchMock);
  await forget([NEWS_KEY]);
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  fetchMock.mockReset();
  failures.mockClear();
  await forget([NEWS_KEY]);
});

const article = (id: number) => ({
  id,
  type: "HeadlineNews",
  headline: `Headline ${id}`,
  published: "2026-10-12T21:17:00Z",
  links: { web: { href: `https://www.espn.com/nhl/story/_/id/${id}/a-story` } },
});

function espnAnswers(...answers: (() => Response)[]) {
  for (const answer of answers) fetchMock.mockImplementationOnce(async () => answer());
}
const news =
  (...ids: number[]) =>
  () =>
    Response.json({ articles: ids.map(article) });
const down = () => new Response("busy", { status: 503 });

test("Home's news is ESPN's headlines, asked for once and then answered from the cache", async () => {
  espnAnswers(news(1, 2));

  const first = await readHomeNews();

  expect(first).toEqual([
    {
      id: "1",
      headline: "Headline 1",
      url: "https://www.espn.com/nhl/story/_/id/1/a-story",
      published: "2026-10-12T21:17:00Z",
    },
    expect.objectContaining({ id: "2" }),
  ]);
  expect(await readHomeNews()).toEqual(first);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(String(fetchMock.mock.calls[0]?.[0])).toBe(NEWS_URL);
});

test("the news is fresh for fifteen minutes, then answered once more while ESPN is asked again", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  espnAnswers(news(1), news(2));
  await cachedNews();

  vi.setSystemTime(Date.now() + 14 * MINUTE);
  expect((await cachedNews()).map((item) => item.id)).toEqual(["1"]);
  expect(fetchMock).toHaveBeenCalledTimes(1);

  vi.setSystemTime(Date.now() + 2 * MINUTE);
  expect((await cachedNews()).map((item) => item.id)).toEqual(["1"]);
  await vi.waitFor(async () => {
    expect((await cachedNews()).map((item) => item.id)).toEqual(["2"]);
  });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test("when ESPN cannot be read and nothing is kept, there is no news and the failure is logged", async () => {
  espnAnswers(down);

  expect(await readHomeNews()).toBeNull();
  expect(failures).toHaveBeenCalledWith(
    "ESPN's news could not be read",
    expect.objectContaining({ endpoint: "news", status: 503 }),
  );
});

test("when ESPN's news changed shape, there is no news", async () => {
  espnAnswers(() => Response.json({ items: [] }));

  expect(await readHomeNews()).toBeNull();
  expect(failures).toHaveBeenCalledWith(
    "ESPN's news could not be read",
    expect.objectContaining({ name: "EspnParseError" }),
  );
});

test("while ESPN cannot be read the last news is listed for six hours, and then none is", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  fetchMock.mockImplementation(async () => down());
  espnAnswers(news(1));
  await readHomeNews();

  vi.setSystemTime(Date.now() + 6 * 60 * MINUTE);
  expect((await readHomeNews())?.map((item) => item.id)).toEqual(["1"]);

  vi.setSystemTime(Date.now() + 16 * MINUTE);
  expect(await readHomeNews()).toBeNull();
});

test("a failed read is not kept: the next one asks ESPN again", async () => {
  espnAnswers(down, news(3));

  expect(await readHomeNews()).toBeNull();
  expect((await readHomeNews())?.map((item) => item.id)).toEqual(["3"]);
});

test("no headlines is no news, and nothing is logged", async () => {
  espnAnswers(news());

  expect(await readHomeNews()).toBeNull();
  expect(failures).not.toHaveBeenCalled();
});

test("in fixture mode the news is the recorded one", async () => {
  vi.stubEnv("ESPN_FIXTURES", "1");

  const recorded = await readHomeNews();

  expect(recorded).toHaveLength(6);
  expect(recorded?.[0]?.url).toBe("https://www.espn.com/nhl/recap?gameId=401892485");
  expect(fetchMock).not.toHaveBeenCalled();
});

const drawn = (news: Parameters<typeof HomeNews>[0]["news"]) =>
  renderToStaticMarkup(createElement(HomeNews, { news }));

test("with no news the section is not drawn at all", () => {
  expect(drawn(null)).toBe("");
  expect(drawn([])).toBe("");
});

test("each News item is one link to ESPN, with the time it was published where ESPN said", () => {
  const html = drawn([
    {
      id: "1",
      headline: "Headline 1",
      url: "https://www.espn.com/nhl/1",
      published: "2026-10-12T21:17:00Z",
    },
    { id: "2", headline: "Headline 2", url: "https://www.espn.com/nhl/2", published: null },
  ]);

  expect(html).toContain("Headlines from ESPN");
  expect(html.match(/<a href="https:\/\/www\.espn\.com\/nhl\/[12]"/g)).toHaveLength(2);
  // The server's time is Eastern, and says so.
  expect(html).toContain("Mon Oct 12</time> · <time");
  expect(html).toContain("5:17 PM ET</time>");
  expect(html.match(/data-slot="news-when"/g)).toHaveLength(1);
});
