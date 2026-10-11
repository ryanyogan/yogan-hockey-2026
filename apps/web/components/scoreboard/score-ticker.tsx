"use client";

import type { ScoreboardGame, ScoreboardSide } from "@yogan-hockey/schemas";
import { FavoriteMarker } from "@yogan-hockey/ui/components/marker";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { favoritesFirst, isFavoriteGame } from "../../lib/favorites";
import {
  gameHref,
  gameStatusLine,
  hasScore,
  type StripReach,
  stripReach,
  TICKER_STRIP_HEIGHT,
  tickerGames,
  wheelScrollLeft,
} from "../../lib/scoreboard-view";
import { useFavorites } from "../../lib/use-favorites";
import { Link } from "../link";
import { TeamMark } from "../team-mark";
import { GameStatus } from "./game-status";
import { useScoreboard } from "./scoreboard-provider";

/** One team in an entry. A team's mark goes before its abbreviation. */
function Side({
  side,
  scored,
  className = "",
}: {
  side: ScoreboardSide;
  scored: boolean;
  className?: string;
}) {
  return (
    <span className={`${side.winner ? "font-bold" : ""} ${className}`}>
      <span className="whitespace-nowrap">
        {/* The gap is 4px on a phone: a cell's 68px then holds the mark, "WSH" and "10". */}
        <TeamMark teamId={side.id} eager className="mr-1 md:mr-1.5" />
        <span data-slot="team">{side.abbreviation}</span>
      </span>
      {scored && <span className="tabular-nums"> {side.score}</span>}
    </span>
  );
}

/*
 * How an entry is laid out. `cell` is the strip's: from `md` up one line, "PIT 3 @ WSH 3 OT 3:21";
 * on a phone the status in small type over the away team over the home team, scores in a column,
 * so that three games fit across 390px where one line fitted one and a half. `row` is the open
 * slate's: one line at any width, the status at its end.
 */
const LAYOUT = {
  cell: {
    link: "max-md:grid max-md:h-full max-md:w-22 max-md:grid-cols-[1fr_auto] max-md:content-center max-md:gap-x-1 max-md:px-2.5 max-md:leading-4 md:flex md:items-baseline md:gap-2 md:px-3 md:py-1.5",
    marker: "max-md:col-start-2 max-md:row-start-1 max-md:text-[10px]",
    side: "max-md:col-span-2 max-md:flex max-md:justify-between max-md:gap-2",
    at: "max-md:sr-only",
    status: "max-md:col-start-1 max-md:row-start-1 max-md:text-[10px]",
  },
  row: {
    link: "flex min-h-11 items-center gap-2 px-4 md:min-h-0 md:px-6 md:py-1.5",
    marker: "",
    side: "",
    at: "",
    status: "ml-auto pl-2",
  },
} as const;

function Entry({
  game,
  favorite,
  layout,
}: {
  game: ScoreboardGame;
  favorite: boolean;
  layout: keyof typeof LAYOUT;
}) {
  const live = game.status === "live";
  const scored = hasScore(game);
  const status = gameStatusLine(game);
  const classes = LAYOUT[layout];
  return (
    <Link
      href={gameHref(game)}
      data-live={live ? "" : undefined}
      data-favorite={favorite ? "" : undefined}
      className={`whitespace-nowrap hover:bg-highlight ${classes.link} ${live ? "bg-live-tint" : ""}`}
    >
      {favorite && (
        <FavoriteMarker className={classes.marker}>
          <span className="sr-only">favorite team, </span>
        </FavoriteMarker>
      )}
      <Side side={game.away} scored={scored} className={classes.side} />
      <span className={`text-foreground/40 ${classes.at}`}>
        <span aria-hidden="true">@</span>
        <span className="sr-only">at</span>
      </span>
      <Side side={game.home} scored={scored} className={classes.side} />
      <span className={`${live ? "font-bold text-live" : "text-foreground/50"} ${classes.status}`}>
        {/* The tint says "live" to the eye only. */}
        {live && status !== "live" && <span className="sr-only">live, </span>}
        <GameStatus game={game} />
      </span>
    </Link>
  );
}

/**
 * A ref for a strip that scrolls sideways: a vertical wheel over it scrolls it, so a mouse with
 * no sideways wheel reaches the entries past the edge. At either end the page scrolls as usual.
 */
function scrollSidewaysByWheel(strip: HTMLElement | null) {
  if (strip == null) return;
  const onWheel = (event: WheelEvent) => {
    const to = wheelScrollLeft(strip, event);
    if (to == null) return;
    event.preventDefault();
    strip.scrollLeft = to;
  };
  // Not passive, which React's own `onWheel` is: the page must not scroll as well.
  strip.addEventListener("wheel", onWheel, { passive: false });
  return () => strip.removeEventListener("wheel", onWheel);
}

const NOTHING_HIDDEN: StripReach = { before: false, after: false, hidden: 0 };

/**
 * What the strip is hiding, kept current as it scrolls, as it or an entry changes size (a font
 * arriving, a window resized) and as its entries change. `order` is the entries, in order.
 *
 * A new order also sends the strip back to its start. A strip that snaps keeps hold of the entry
 * it had snapped to, so when a favorite or a game just begun took the lead it did so out of view,
 * to the left of where the strip stood.
 */
function useStripReach(order: string) {
  const strip = useRef<HTMLUListElement>(null);
  const [reach, setReach] = useState(NOTHING_HIDDEN);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new order is new entries to measure.
  useEffect(() => {
    const list = strip.current;
    if (list == null) {
      setReach(NOTHING_HIDDEN);
      return;
    }
    list.scrollLeft = 0;
    const measure = () => {
      const spans = Array.from(list.children, (entry) => {
        const { offsetLeft, offsetWidth } = entry as HTMLElement;
        return { left: offsetLeft, right: offsetLeft + offsetWidth };
      });
      const next = stripReach(list, spans);
      setReach((was) =>
        was.before === next.before && was.after === next.after && was.hidden === next.hidden
          ? was
          : next,
      );
    };
    const sizes = new ResizeObserver(measure);
    sizes.observe(list);
    for (const entry of list.children) sizes.observe(entry);
    list.addEventListener("scroll", measure, { passive: true });
    measure();
    return () => {
      sizes.disconnect();
      list.removeEventListener("scroll", measure);
    };
  }, [order]);
  return { strip, reach };
}

/**
 * The strip's edges fade where it runs on past them, so a cut entry reads as "more this way". The
 * fade is `--fade` wide: narrow on a phone, where it must not reach the score in a cell that is
 * wholly in view.
 */
const FADE_WIDTH = "[--fade:1rem] md:[--fade:2.5rem]";
const FADE = {
  after: "[mask-image:linear-gradient(to_right,black_calc(100%-var(--fade)),transparent)]",
  before: "[mask-image:linear-gradient(to_left,black_calc(100%-var(--fade)),transparent)]",
  both: "[mask-image:linear-gradient(to_right,transparent,black_var(--fade),black_calc(100%-var(--fade)),transparent)]",
} as const;

function fadeOf({ before, after }: StripReach): string {
  if (before && after) return FADE.both;
  if (after) return FADE.after;
  return before ? FADE.before : "";
}

/**
 * The score ticker: today's games across the top of every page, each linking to its game. Away
 * then home, the winner in bold, a game in progress tinted. "scores" stays put at its start and
 * leads to `/nhl/live`.
 *
 * The strip scrolls sideways inside itself, by touch (stopping on an entry's edge), a sideways
 * wheel or a plain vertical one. When it holds more than fits, the edge it runs past fades and a
 * button at its end counts the games out of view ("+9") and opens the whole slate beneath, a row
 * to a game, so every game is one tap away without scrolling sideways at all. The slate closes on
 * the way to another page, and on Escape.
 */
export function ScoreTicker() {
  const { date, games } = useScoreboard();
  const favoriteTeamIds = useFavorites("team").ids;
  const pathname = usePathname();
  // Open on the page it was opened on: going anywhere else closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  // Favorite teams' games lead the whole strip, whatever their status.
  const ordered = favoritesFirst(tickerGames(games), favoriteTeamIds);
  const { strip, reach } = useStripReach(ordered.map((game) => game.id).join());
  // One function for the strip's life, so the wheel's listener is added once.
  const stripRef = useCallback(
    (list: HTMLUListElement | null) => {
      strip.current = list;
      const stopWheel = scrollSidewaysByWheel(list);
      return () => {
        stopWheel?.();
        strip.current = null;
      };
    },
    [strip],
  );
  const opener = useRef<HTMLButtonElement>(null);
  const slateId = useId();
  const open = openOn === pathname && ordered.length > 0;
  // Escape closes the slate wherever the focus is: Safari does not focus a button it is tapped on.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenOn(null);
      opener.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);
  // Before the Scoreboard has a slate there is nothing to say, and the strip takes no room.
  if (date == null) return null;
  return (
    <nav aria-label="Scores">
      <div className={`flex ${TICKER_STRIP_HEIGHT}`}>
        <Link
          href="/nhl/live"
          className="flex shrink-0 items-center border-rule border-r px-3 font-bold uppercase hover:bg-highlight md:px-6 md:py-1.5"
        >
          scores
        </Link>
        {ordered.length === 0 ? (
          <p className="self-center px-3 text-foreground/50 md:py-1.5">No games today</p>
        ) : (
          // Positioned, so the entries' text for screen readers stays inside the scrolling strip.
          <ul
            ref={stripRef}
            className={`relative flex min-w-0 flex-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] max-md:snap-x max-md:snap-mandatory ${FADE_WIDTH} ${fadeOf(reach)}`}
          >
            {ordered.map((game) => (
              <li key={game.id} className="shrink-0 snap-start border-border border-r">
                <Entry game={game} favorite={isFavoriteGame(game, favoriteTeamIds)} layout="cell" />
              </li>
            ))}
          </ul>
        )}
        {(reach.hidden > 0 || open) && (
          <button
            ref={opener}
            type="button"
            aria-expanded={open}
            aria-controls={open ? slateId : undefined}
            onClick={() => setOpenOn(open ? null : pathname)}
            // One width open or closed on a phone, so the strip beside it does not move.
            className="flex w-12 shrink-0 cursor-pointer items-center justify-center gap-1 border-rule border-l font-bold hover:bg-highlight md:w-auto md:min-w-11 md:gap-1.5 md:px-3"
          >
            <span className="sr-only">
              {open ? "Close the slate" : `All ${ordered.length} games`}
            </span>
            {!open && (
              <span aria-hidden="true" className="tabular-nums">
                +{reach.hidden}
              </span>
            )}
            {/* Drawn, not typed: Geist Mono has no arrow, and each fallback font draws its own. */}
            <span
              aria-hidden="true"
              className={`size-0 border-x-4 border-x-transparent border-t-[5px] border-t-current ${open ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>
      {open && (
        // The last row's rule is cut off: the rule under the ticker closes the slate.
        <div className="overflow-hidden border-rule border-t">
          <ul
            id={slateId}
            aria-label="All of today's games"
            className="relative -mb-px grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
          >
            {ordered.map((game) => (
              <li key={game.id} className="border-border border-r border-b">
                <Entry game={game} favorite={isFavoriteGame(game, favoriteTeamIds)} layout="row" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}
