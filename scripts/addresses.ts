// Every address of the site as `main` (vinext) answered it, for scripts/address-parity.ts: each
// page and route handler under `main`'s apps/web/app, with the ids a fixture build can draw, the
// files in its public directory, and the awkward addresses around them. Pure: the list, how two
// answers are compared, and the table. Tested in addresses.test.ts.

export type Address = {
  /** GET unless said. */
  method?: string;
  path: string;
  /** Which part of the site's surface the address is from. */
  group: string;
  /** Set when the two sites are meant to answer differently: why. */
  intended?: string;
};

export type Answer = {
  status: number;
  /** `location`, with the site's own origin taken off so two sites on two ports compare. */
  location: string | null;
  /** The document's `<title>`, when the answer is HTML. */
  title: string | null;
  /** The media type, without its parameters. */
  type: string | null;
  /** `allow`, which a refused method carries. */
  allow: string | null;
};

const TEAM = "21";
const SKATER = "4024123";
const GOALIE = "3067313";
const FINISHED = "401803652";
const SCHEDULED = "401892449";
/** On today's recorded slate with no recorded summary: the nearest a fixture build has to a game ESPN cannot describe. */
const UNRECORDED = "401891815";

const page = (group: string, paths: string[]): Address[] => paths.map((path) => ({ path, group }));

export function addresses(): Address[] {
  const team = `/nhl/teams/${TEAM}`;
  const skater = `/players/${SKATER}`;
  const game = (id: string) => [
    `/nhl/games/${id}`,
    `/nhl/games/${id}/scoring`,
    `/nhl/games/${id}/pick`,
  ];
  return [
    ...page("pages", [
      "/",
      "/nhl",
      "/nhl?tab=teams",
      "/nhl?tab=standings",
      "/nhl?view=division",
      "/nhl?view=conference",
      "/nhl?view=wildcard",
      "/nhl?view=league",
      "/nhl/live",
      team,
      `${team}/roster`,
      `${team}/stats`,
      ...game(FINISHED),
      ...game(SCHEDULED),
      "/players",
      "/players?q=mar",
      skater,
      `${skater}/games`,
      `/players/${GOALIE}`,
      `/players/${GOALIE}/games`,
    ]),
    ...page("sample pages", [
      "/skeleton",
      "/skeleton/dashboard",
      "/skeleton/live",
      "/skeleton/picks",
    ]),
    {
      path: "/skeleton/loading",
      group: "sample pages",
      intended:
        "The page of placeholders is gone on purpose: nothing draws a placeholder now (#192).",
    },
    ...["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"].map((method) => ({
      method,
      path: "/picks",
      group: "/picks",
      intended:
        "The JSON route is gone on purpose: /picks is the Picks page, as any page answers a method (#218).",
    })),
    ...page("files", [
      "/manifest.webmanifest",
      "/favicon.ico",
      "/robots.txt",
      "/sitemap.xml",
      "/icons/pwa-64x64.png",
      "/icons/pwa-192x192.png",
      "/icons/pwa-512x512.png",
      "/icons/maskable-icon-192x192.png",
      "/icons/maskable-icon-512x512.png",
      "/icons/apple-touch-icon-180x180.png",
      "/icons/apple-splash-portrait-light-1170x2532.png",
      "/icons/apple-splash-portrait-dark-1170x2532.png",
      "/icons/no-such-icon.png",
      "/apple-touch-icon.png",
      "/team-marks/10-28.2288c70a.webp",
      "/team-marks/no-such-mark.webp",
      "/_headers",
      "/sw.js",
    ]),
    ...page("unknown ids", [
      "/nhl/teams/999",
      // A team ESPN has, with no recording: the read fails as it does when ESPN is down.
      "/nhl/teams/1",
      "/nhl/games/1",
      `/nhl/games/${UNRECORDED}`,
      `/nhl/games/${UNRECORDED}/scoring`,
      `/nhl/games/${UNRECORDED}/pick`,
      "/players/1",
      "/players/1/games",
      "/players?q=zzzz",
      "/players?q=",
    ]),
    ...page("ids that are not numbers", [
      "/nhl/teams/leafs",
      "/nhl/teams/leafs/roster",
      "/nhl/games/abc",
      "/nhl/games/abc/scoring",
      "/players/abc",
      "/players/abc/games",
      "/players/rylan-yogan",
      "/players/easter-egg-rylan-yogan",
      "/nhl/teams/21abc",
      "/nhl/teams/-1",
      "/nhl/teams/%20",
      // A space at the very end of a path, which Start's server drops unless the Worker keeps it.
      "/nhl/teams/21%20",
      `/players/${SKATER}%20`,
      `/nhl/games/${FINISHED}%20`,
      "/nhl%20",
    ]),
    ...page("unknown paths", [
      "/no-such-page",
      "/nhl/standings",
      "/nhl/teams",
      "/nhl/games",
      `${team}/coaches`,
      `${team}/roster/more`,
      "/nhl/teams/leafs/coaches",
      `/nhl/games/${FINISHED}/box`,
      `/nhl/games/${FINISHED}/scoring/more`,
      `${skater}/career`,
      `${skater}/games/more`,
      "/players/abc/career",
      "/skeleton/nope",
      "/family/rylan",
      "/yogan",
      "/NHL",
      "/Players",
      "/nhl/Live",
      "/PICKS",
      `${team}/Roster`,
      "/picks/more",
    ]),
    ...page("old links", [
      `${team}?tab=roster`,
      `${team}?tab=stats`,
      `${team}?tab=schedule`,
      `${team}?tab=bogus`,
      `${team}?tab=roster&x=1`,
      `${team}/roster?tab=stats`,
      "/nhl/teams/leafs?tab=roster",
      `/nhl/games/${FINISHED}?tab=scoring`,
      `/nhl/games/${FINISHED}?tab=pick`,
      `/nhl/games/${FINISHED}?tab=plays`,
      `/nhl/games/${FINISHED}?tab=bogus`,
      `/nhl/games/${FINISHED}?tab=scoring&x=1`,
      `/nhl/games/${FINISHED}?tab=scoring&tab=pick`,
      `/nhl/games/${FINISHED}/scoring?tab=pick`,
      "/nhl/games/abc?tab=scoring",
      `${skater}?games=all`,
      `${skater}?games=all&x=1`,
      `${skater}?games=some`,
      `${skater}/games?games=all`,
      "/players/abc?games=all",
    ]),
    ...page("trailing slashes", [
      "/nhl/",
      "/nhl/live/",
      `${team}/`,
      `${team}/roster/`,
      `/nhl/games/${FINISHED}/`,
      "/players/",
      `${skater}/`,
      "/picks/",
      "/skeleton/",
      "/no-such-page/",
      "/nhl/?x=1",
      "/nhl//",
      `${team}/?tab=roster`,
      "/nhl/teams/%20/",
    ]),
    { method: "POST", path: "/nhl/", group: "trailing slashes" },
    ...page("search parameters no page reads", [
      "/?x=1",
      "/nhl?x=1",
      "/nhl?tab=bogus",
      "/nhl?view=bogus",
      "/nhl?tab=teams&view=league",
      "/nhl/live?x=1",
      `${team}?x=1`,
      `${team}/roster?x=1`,
      `/nhl/games/${FINISHED}?utm_source=a`,
      "/players?x=1",
      "/players?q=mar&x=1",
      `${skater}?x=1`,
      "/picks?x=1",
      "/manifest.webmanifest?x=1",
    ]),
    // A plain GET, with no upgrade to a socket.
    ...page("/agents/*", [
      "/agents/scoreboard-agent/main",
      `/agents/game-agent/${FINISHED}`,
      "/agents/skeleton-agent/skeleton",
      "/agents/no-such-agent/main",
      "/agents/scoreboard-agent",
      "/agents/",
      "/agents",
    ]),
    ...["HEAD", "POST"].map((method) => ({
      method,
      path: "/nhl",
      group: "other methods on a page",
    })),
    {
      path: "/nhl.rsc",
      group: "vinext's own",
      intended:
        "vinext's transport for a navigation, not an address of the site: TanStack Start asks /_serverFn/* instead.",
    },
    {
      path: `${team}.rsc?tab=roster`,
      group: "vinext's own",
      intended: "The 308 of an old link asked for over vinext's transport, which is gone with it.",
    },
  ];
}

/** An answer's `location` without the origin of the site asked, so two ports compare. */
export function ownPath(location: string | null, base: string): string | null {
  if (location == null) return null;
  const origin = new URL(base).origin;
  return location.startsWith(origin) ? location.slice(origin.length) || "/" : location;
}

/** The text of the first `<title>` in a document, entities left as written. */
export function titleOf(html: string): string | null {
  const found = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return found == null ? null : (found[1] ?? "").trim().replace(/\s+/g, " ");
}

export type Compared = {
  address: Address;
  main: Answer;
  branch: Answer;
  /** Status or `location` differ. */
  differs: boolean;
  /** Differences that are reported and do not fail: the title, the media type, `allow`. */
  notes: string[];
};

export function compare(address: Address, main: Answer, branch: Answer): Compared {
  const notes: string[] = [];
  const noted = (what: string, was: string | null, is: string | null) => {
    if (was !== is) notes.push(`${what}: ${was ?? "none"} on main, ${is ?? "none"} on the branch`);
  };
  noted("title", main.title, branch.title);
  noted("type", main.type, branch.type);
  noted("allow", main.allow, branch.allow);
  return {
    address,
    main,
    branch,
    differs: main.status !== branch.status || main.location !== branch.location,
    notes,
  };
}

export type Verdict = "same" | "intended" | "differs" | "intended, but the same";

/** A difference is a failure unless the address says it is meant; one meant that did not happen is said. */
export function verdict(compared: Compared): Verdict {
  const intended = compared.address.intended != null;
  if (compared.differs) return intended ? "intended" : "differs";
  return intended ? "intended, but the same" : "same";
}

/** Whether the run fails: any difference in status or `location` that no address calls intended. */
export function fails(all: Compared[]): boolean {
  return all.some((compared) => verdict(compared) === "differs");
}

const cell = (text: string | null) => (text == null ? "" : text.replaceAll("|", "\\|"));
const answered = (answer: Answer) =>
  answer.location == null
    ? String(answer.status)
    : `${answer.status} → \`${cell(answer.location)}\``;

/** Every address with what each site answered, the differences first. */
export function parityReport(all: Compared[], sites: { main: string; branch: string }): string {
  const count = (of: Verdict) => all.filter((compared) => verdict(compared) === of).length;
  const line = (compared: Compared) =>
    `| ${[
      compared.address.group,
      `\`${compared.address.method ?? "GET"} ${cell(compared.address.path)}\``,
      answered(compared.main),
      answered(compared.branch),
      cell(compared.main.title),
      cell(compared.branch.title),
      verdict(compared) === "same" ? "" : `**${verdict(compared)}**`,
    ].join(" | ")} |`;
  const head = [
    "| Part | Address | `main` | Branch | `main`'s title | Branch's title | |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  const differing = all.filter((compared) => verdict(compared) !== "same");
  const noted = all.filter((compared) => compared.notes.length > 0);
  return [
    `${all.length} addresses asked of \`main\` (${sites.main}) and the branch (${sites.branch}), redirects not followed: ${count("same")} answer with the same status and \`location\`, ${count("differs")} differ, ${count("intended")} differ as intended${count("intended, but the same") > 0 ? `, ${count("intended, but the same")} were meant to differ and did not` : ""}.`,
    "## Differences in status or `location`",
    differing.length === 0
      ? "None."
      : [
          ...head,
          ...differing.map(line),
          "",
          ...differing.flatMap((compared) =>
            compared.address.intended == null
              ? []
              : [`- \`${compared.address.path}\`: ${compared.address.intended}`],
          ),
        ].join("\n"),
    "## Differences reported, not failed",
    noted.length === 0
      ? "None."
      : noted
          .map(
            (compared) =>
              `- \`${compared.address.method ?? "GET"} ${compared.address.path}\`: ${compared.notes.join("; ")}`,
          )
          .join("\n"),
    "## Every address",
    [...head, ...all.map(line)].join("\n"),
    "",
  ].join("\n\n");
}
