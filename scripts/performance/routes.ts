// Every route of the site as the measurement visits it: which page, what to tap and where to go.

/** A tap (or typing) whose time to the next paint is measured. The first selector that is on screen is used. */
export type Interaction = { name: string; selector: string; type?: string };

export type MeasuredRoute = {
  /** The route as the app names it. */
  route: string;
  path: string;
  /**
   * Whether vinext's page cache kept the page (`pagePolicy` in `main`'s apps/web/lib/page-cache.ts):
   * on a site that has one it is then measured cached and rendered. The TanStack Start site keeps
   * no page (ADR 0009), and every route of it is measured as rendered.
   */
  cacheable: boolean;
  /** The link tapped to measure a navigation: the first on screen. */
  navigate: string;
  /** Taps measured on this route beside the shell's. */
  interactions: Interaction[];
};

/** On every route: the shell's own controls. */
export const SHELL_INTERACTIONS: Interaction[] = [
  // Agate's two theme buttons, Day and Night: on a phone only the one that leads to the other
  // theme is drawn, and the first on screen is the one tapped.
  { name: "theme toggle", selector: '[role="group"][aria-label="Theme"] button' },
  { name: "open the whole slate", selector: 'nav button:has-text("games")' },
];

export type Subjects = {
  team: string;
  player: string;
  goalie: string;
  finishedGame: string;
  /** A game still to be played, or null when there is none to measure. */
  scheduledGame: string | null;
  search: string;
};

/** The fixture build's subjects: the only ids a build with `ESPN_FIXTURES=1` can draw. */
export const FIXTURE_SUBJECTS: Subjects = {
  team: "21",
  player: "4024123",
  goalie: "3067313",
  finishedGame: "401803652",
  scheduledGame: "401892449",
  search: "mar",
};

const heart: Interaction = {
  name: "favorite heart",
  selector: 'main button[aria-label^="Favorite"]',
};

export function measuredRoutes(subjects: Subjects): MeasuredRoute[] {
  const team = `/nhl/teams/${subjects.team}`;
  const game = `/nhl/games/${subjects.finishedGame}`;
  const player = `/players/${subjects.player}`;
  const goal: Interaction = {
    name: "select a goal on the timeline",
    selector: 'main [data-slot="timeline-tick"][data-label*="Goal"]',
  };
  const routes: MeasuredRoute[] = [
    {
      route: "/",
      path: "/",
      cacheable: false,
      navigate: 'main a[href^="/nhl/games/"]',
      interactions: [],
    },
    {
      route: "/nhl",
      path: "/nhl",
      cacheable: true,
      navigate: 'main a[href^="/nhl/teams/"]',
      interactions: [],
    },
    {
      route: "/nhl?tab=teams",
      path: "/nhl?tab=teams",
      cacheable: true,
      navigate: 'main a[href^="/nhl/teams/"]',
      interactions: [],
    },
    {
      route: "/nhl/live",
      path: "/nhl/live",
      cacheable: false,
      navigate: 'main a[href^="/nhl/games/"]',
      interactions: [],
    },
    {
      route: "/nhl/teams/:id",
      path: team,
      cacheable: true,
      navigate: `main a[href="${team}/roster"]`,
      interactions: [heart],
    },
    {
      route: "/nhl/teams/:id/roster",
      path: `${team}/roster`,
      cacheable: true,
      navigate: 'main a[href^="/players/"]',
      interactions: [heart],
    },
    {
      route: "/nhl/teams/:id/stats",
      path: `${team}/stats`,
      cacheable: true,
      navigate: `main a[href="${team}"]`,
      interactions: [heart],
    },
    {
      route: "/nhl/games/:id (finished)",
      path: game,
      cacheable: true,
      navigate: `main a[href="${game}/scoring"]`,
      interactions: [goal],
    },
    {
      route: "/nhl/games/:id/scoring",
      path: `${game}/scoring`,
      cacheable: true,
      navigate: `main a[href="${game}/pick"], main a[href="${game}"]`,
      interactions: [goal],
    },
    {
      route: "/nhl/games/:id/pick",
      path: `${game}/pick`,
      cacheable: true,
      navigate: `main a[href="${game}"]`,
      interactions: [goal],
    },
    {
      route: "/players",
      path: "/players",
      cacheable: true,
      navigate: 'main a[href="/nhl?tab=teams"]',
      interactions: [{ name: "type in the search", selector: 'main input[name="q"]', type: "m" }],
    },
    {
      route: "/players?q=",
      path: `/players?q=${subjects.search}`,
      cacheable: false,
      navigate: 'main a[href^="/players/"]',
      interactions: [heart],
    },
    {
      route: "/players/:id (skater)",
      path: player,
      cacheable: true,
      navigate: 'main a[href^="/nhl/teams/"]',
      interactions: [heart],
    },
    {
      route: "/players/:id/games",
      path: `${player}/games`,
      cacheable: true,
      navigate: 'main a[href^="/nhl/games/"]',
      interactions: [heart],
    },
    {
      route: "/players/:id (goalie)",
      path: `/players/${subjects.goalie}`,
      cacheable: true,
      navigate: 'main a[href^="/nhl/teams/"]',
      interactions: [heart],
    },
  ];
  // An address no route answers. It has no script budget: the baseline did not measure it.
  routes.push({
    route: "not found",
    path: "/no-such-page",
    cacheable: false,
    navigate: 'main a[href="/"]',
    interactions: [],
  });
  if (subjects.scheduledGame != null) {
    routes.splice(10, 0, {
      route: "/nhl/games/:id (scheduled)",
      path: `/nhl/games/${subjects.scheduledGame}`,
      // In `pagePolicy`, but the page keeps itself out of the cache until the game is archived.
      cacheable: false,
      navigate: 'main a[href^="/nhl/teams/"]',
      interactions: [],
    });
  }
  return routes;
}
