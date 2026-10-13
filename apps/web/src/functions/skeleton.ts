import { env, exports } from "cloudflare:workers";
import { notFound, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { createDb, latestSkeletonBumps, type SkeletonBump } from "@yogan-hockey/db";
import {
  type MadeSlatePick,
  type News,
  type Pulse,
  PulseSchema,
  type Reading,
  type ScoreboardState,
  type SeasonRecord,
  type StandingsTable,
} from "@yogan-hockey/schemas";
import { getAgentByName } from "agents";
import { z } from "zod";
import { AGATE_SLATES } from "../../lib/agate-slates";
import { topOfConferences } from "../../lib/dashboard";
import { cachedStandings } from "../../lib/espn";
import { readHomeNews } from "../../lib/home-news";
import { seedSamplePicks } from "../../lib/sample-picks";
import { EMPTY_SLATE, QUIET_SLATE, SAMPLE_SLATE } from "../../lib/sample-slate";
import { cachedSkeletonReading, SKELETON_AGENT_NAME } from "../../lib/skeleton";
import { pageRead } from "./page-read";

/** What `/skeleton` draws: one answer from each store the design rests on. */
export type SkeletonRead = {
  /** The cached reading, from KV. */
  reading: Reading;
  /** The latest rows the Agent wrote, from D1. */
  bumps: SkeletonBump[];
  /** The Agent's state for first paint, over Durable Object RPC. */
  pulse: Pulse;
  /** The Agent's name in the socket's address, for the pushes that follow. */
  agentName: string;
};

/** `/skeleton`'s one read. */
export const readSkeleton = createServerFn({ method: "GET" }).handler(() =>
  pageRead<SkeletonRead>(async () => {
    const agent = await getAgentByName(exports.SkeletonAgent, SKELETON_AGENT_NAME);
    const [reading, bumps, rpcPulse] = await Promise.all([
      cachedSkeletonReading(),
      latestSkeletonBumps(createDb(env.DB), 5),
      agent.getPulse(),
    ]);
    // An RPC result is not a plain object; parsing copies it into one that can cross to the browser.
    return {
      reading,
      bumps,
      pulse: PulseSchema.parse(rpcPulse),
      agentName: SKELETON_AGENT_NAME,
    };
  }),
);

/**
 * Bumps the Skeleton Agent, which forgets the cached reading itself. The page asks the router to
 * run its loaders again once this has answered.
 */
export const bumpSkeleton = createServerFn({ method: "POST" }).handler(async (): Promise<void> => {
  const agent = await getAgentByName(exports.SkeletonAgent, SKELETON_AGENT_NAME);
  await agent.bump();
});

/** `/skeleton/picks` exists in fixture mode only: anywhere else it is not found. */
function fixtureModeOnly(): void {
  if (process.env.ESPN_FIXTURES !== "1") throw notFound();
}

/** `/skeleton/picks`'s one read, which is only whether the page exists. */
export const readSamplePicksPage = createServerFn({ method: "GET" }).handler(() =>
  pageRead(async () => {
    fixtureModeOnly();
    return null;
  }),
);

/** Which way the recorded final's sample pick goes. Anything but "wrong" is "right". */
export const SeedPicksSchema = z.object({ final: z.enum(["right", "wrong"]).catch("right") });

/**
 * Writes the sample picks of `/skeleton/picks` to D1, then sends the page to `?seeded=`, which
 * says the rows are in. Fixture mode only.
 */
export const seedPicks = createServerFn({ method: "POST" })
  .validator(SeedPicksSchema)
  .handler(async ({ data }): Promise<never> => {
    if (process.env.ESPN_FIXTURES !== "1") throw new Error("Sample picks are for fixture mode");
    await seedSamplePicks(data.final);
    throw redirect({ href: `/skeleton/picks?seeded=${data.final}` });
  });

/** Which sample `/skeleton/dashboard` draws. Anything unreadable is the default: no slate, no picks. */
export const SampleDashboardSchema = z.object({
  slate: z.string().optional().catch(undefined),
  picks: z.boolean().catch(false),
  /** False draws the page as it is when ESPN's news could not be read. */
  news: z.boolean().catch(true),
});

/** What `/skeleton/dashboard` draws: a slate that is not today's, with what Home is handed. */
export type SampleDashboardRead = {
  scoreboard: ScoreboardState;
  picks: Record<string, MadeSlatePick>;
  record: SeasonRecord | null;
  /** The real ones, as Home reads them: null when ESPN's could not be read. */
  standings: StandingsTable[] | null;
  /** The real ones too, or null when there are none to list or the address asked for none. */
  news: News | null;
};

/**
 * A pick for the home side of every other game of the invented slate, so each state is drawn
 * with a pick and without one, and the finals are marked both ways.
 */
const SAMPLE_PICKS: Record<string, MadeSlatePick> = Object.fromEntries(
  SAMPLE_SLATE.games
    .filter((_, index) => index % 2 === 0)
    .map((game) => [game.id, { status: "made", pickTeamId: game.home.id, winProbability: 58 }]),
);

function sampleDashboard({
  slate,
  picks,
}: Pick<z.infer<typeof SampleDashboardSchema>, "slate" | "picks">): Omit<
  SampleDashboardRead,
  "standings" | "news"
> {
  const agate = slate == null ? undefined : AGATE_SLATES[slate];
  if (agate) return agate;
  const scoreboard = slate === "empty" ? EMPTY_SLATE : SAMPLE_SLATE;
  return picks
    ? { scoreboard, picks: SAMPLE_PICKS, record: { right: 34, wrong: 21 } }
    : { scoreboard, picks: {}, record: null };
}

/**
 * `/skeleton/dashboard`'s one read.
 *
 * - no `slate`: the invented slate of `/skeleton/live`, which has a game in every state.
 *   `picks` gives half its games a pick and the season a record.
 * - `empty`: a day with no games.
 * - `tonight` and `busy`: the Agate prototype's two slates with their picks and records, which
 *   `scripts/agate-home-compare.mjs` measures against the prototype.
 * - `news` false: no headlines, as when ESPN's news cannot be read.
 */
export const readSampleDashboard = createServerFn({ method: "GET" })
  .validator(SampleDashboardSchema)
  .handler(({ data }) =>
    pageRead<SampleDashboardRead>(async () => {
      // Extras, as on Home: neither read fails the page.
      const [standings, news] = await Promise.all([
        cachedStandings()
          .then(topOfConferences)
          .catch(() => null),
        data.news ? readHomeNews() : null,
      ]);
      return { ...sampleDashboard(data), standings, news };
    }),
  );

/** Which slate `/skeleton/live` draws. Anything but `empty` and `quiet` is the mixed one. */
export const SampleLiveSchema = z.object({ slate: z.string().optional().catch(undefined) });

const LIVE_SLATES: Record<string, ScoreboardState> = { empty: EMPTY_SLATE, quiet: QUIET_SLATE };

/**
 * `/skeleton/live`'s one read: an invented slate with a game in every state, `empty` a day with
 * no games, or `quiet` one with two.
 */
export const readSampleLive = createServerFn({ method: "GET" })
  .validator(SampleLiveSchema)
  .handler(({ data }) =>
    pageRead<ScoreboardState>(async () => LIVE_SLATES[data.slate ?? ""] ?? SAMPLE_SLATE),
  );
