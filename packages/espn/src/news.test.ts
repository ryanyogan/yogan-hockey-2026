import { NEWS_LIMIT } from "@yogan-hockey/schemas";
import { expect, test } from "vitest";
import { endpoints } from "./endpoints.ts";
import { EspnParseError } from "./errors.ts";
import { loadFixture } from "./fixtures.ts";
import { translateNews } from "./news.ts";

type Article = Record<string, unknown>;
const recorded = async () => (await loadFixture(endpoints.news())) as { articles: Article[] };

/** An article ESPN could have sent, as the recorded ones are. */
const article = (id: number, changes: Article = {}): Article => ({
  id,
  type: "HeadlineNews",
  headline: `Headline ${id}`,
  published: "2026-10-12T21:17:00Z",
  links: { web: { href: `https://www.espn.com/nhl/story/_/id/${id}/a-story` } },
  ...changes,
});

test("the recorded news is ESPN's first headlines, in its order, each leading to ESPN", async () => {
  const news = translateNews(await recorded());

  expect(news).toHaveLength(NEWS_LIMIT);
  expect(news[0]).toEqual({
    id: "50168762",
    headline: "Noah Ostlund scores go-ahead goal in third period in Sabres' 5-3 win over Panthers",
    // ESPN sends a recap's address as http.
    url: "https://www.espn.com/nhl/recap?gameId=401892485",
    published: "2026-10-12T21:18:27Z",
  });
  expect(news.map((item) => item.id)).toEqual([
    "50168762",
    "50168025",
    "50168628",
    // 50168376 is a video of highlights, not something to read.
    "50168195",
    "50168099",
    "50166671",
  ]);
  for (const item of news) expect(new URL(item.url).hostname).toBe("www.espn.com");
});

test("matches the snapshot", async () => {
  expect(translateNews(await recorded())).toMatchSnapshot();
});

test("an article the site cannot read is left out and the rest are kept", () => {
  const news = translateNews({
    articles: [
      article(1),
      article(2, { headline: undefined }),
      article(3, { links: { mobile: { href: "https://m.espn.com/nhl/story?storyId=3" } } }),
      article(4, { links: "none" }),
      "not an article",
      null,
      article(5, { headline: "   " }),
      article(6),
    ],
  });

  expect(news.map((item) => item.id)).toEqual(["1", "6"]);
});

test("a link that does not lead to ESPN's own site is not kept", () => {
  const leadsTo = (href: string) => article(Number(href.length), { links: { web: { href } } });
  const news = translateNews({
    articles: [
      leadsTo("https://www.espn.com.example.org/nhl/story"),
      leadsTo("javascript:alert(1)"),
      leadsTo("//www.espn.com/nhl/story/_/id/1"),
      leadsTo("ftp://www.espn.com/nhl/story/_/id/22"),
      leadsTo("http://espn.com/nhl/story/_/id/333"),
    ],
  });

  expect(news.map((item) => item.url)).toEqual(["https://espn.com/nhl/story/_/id/333"]);
});

test("fields ESPN may stop sending, or send another way, do not cost an article", () => {
  const news = translateNews({
    articles: [
      // No type, no time, an id as text, a headline with space around it.
      { id: "7", headline: "  Seven  ", links: { web: { href: "https://www.espn.com/nhl/7" } } },
      article(8, { published: "yesterday" }),
      article(9, { published: "2026-10-12T21:17:00.000+00:00" }),
      // The link as the address itself, as ESPN did to a headshot on 2026-10-12.
      article(10, { links: { web: "https://www.espn.com/nhl/10" } }),
    ],
  });

  expect(news).toEqual([
    { id: "7", headline: "Seven", url: "https://www.espn.com/nhl/7", published: null },
    {
      id: "8",
      headline: "Headline 8",
      url: "https://www.espn.com/nhl/story/_/id/8/a-story",
      published: null,
    },
    {
      id: "9",
      headline: "Headline 9",
      url: "https://www.espn.com/nhl/story/_/id/9/a-story",
      published: "2026-10-12T21:17:00.000Z",
    },
    {
      id: "10",
      headline: "Headline 10",
      url: "https://www.espn.com/nhl/10",
      published: "2026-10-12T21:17:00Z",
    },
  ]);
});

test("an article ESPN lists twice is listed once", () => {
  const news = translateNews({ articles: [article(1), article(1), article(2)] });

  expect(news.map((item) => item.id)).toEqual(["1", "2"]);
});

test("videos are left out, and no more than the limit are kept", () => {
  const articles = [
    article(100, { type: "Media" }),
    ...Array.from({ length: NEWS_LIMIT + 3 }, (_, at) => article(at + 1)),
  ];

  const news = translateNews({ articles });

  expect(news.map((item) => item.id)).toEqual(["1", "2", "3", "4", "5", "6"]);
});

test("no news is no news, not a failure", () => {
  expect(translateNews({ articles: [] })).toEqual([]);
  expect(translateNews({ articles: [article(1, { type: "Media" })] })).toEqual([]);
});

test("a response with no list of articles is a parse error naming the endpoint", () => {
  for (const response of [{}, { articles: "none" }, null, []]) {
    expect(() => translateNews(response)).toThrow(EspnParseError);
  }
  expect(() => translateNews({})).toThrow(/ESPN news did not parse: articles/);
});

test("articles of which not one can be read are a parse error that says where", async () => {
  const { articles } = await recorded();
  const renamed = articles.map(({ headline, ...rest }) => ({ ...rest, title: headline }));

  expect(() => translateNews({ articles: renamed })).toThrow(EspnParseError);
  expect(() => translateNews({ articles: renamed })).toThrow(/articles\.0\.headline/);
});
