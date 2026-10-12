"use client";

import { useNavigate, useRouterState } from "@tanstack/react-router";
import { focusRing } from "@yogan-hockey/ui/components/nav-item";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { FavoriteHeart } from "../../components/favorites/favorite-heart";
import { PlayerLedger } from "../../components/players/player-ledger";
import {
  MAX_SEARCH_LENGTH,
  MIN_SEARCH_LENGTH,
  readPlayersPage,
  unansweredSearch,
} from "../../lib/player-search";
import type { PlayerSearch as Search } from "../../lib/players";

/** How long the visitor must pause before what he has typed is searched for. */
const TYPING_PAUSE_MS = 250;

/**
 * The search box. The search is the address's: `/players`' loader reads the one `?q=` names and
 * the page hands its answer over as `initial`. Each pause in typing writes what is in the box
 * into the address, which is what asks for it, so the page can be reloaded, pasted or linked at
 * any point.
 *
 * Without JavaScript it is a plain form that loads `/players?q=...`.
 */
export function PlayerSearch({ initial }: { initial: Search }) {
  const navigate = useNavigate();
  const [text, setText] = useState(initial.query);
  const [searching, setSearching] = useState(false);
  // Only the latest question ends the wait.
  const asked = useRef(0);
  // What is in the box now, which may be more than was last asked.
  const typed = useRef(initial.query);
  // The search this box last put in the address, which tells its own rewrites from a link's.
  const sent = useRef(initial.query);
  const inputId = useId();

  const ask = useDebouncedCallback(async () => {
    const ticket = ++asked.current;
    const q = readPlayersPage({ q: typed.current }).q;
    sent.current = q;
    setSearching(true);
    try {
      // In place: the same entry of the history, the page where it is and nothing animated.
      await navigate({
        to: "/players",
        search: q === "" ? {} : { q },
        replace: true,
        resetScroll: false,
        viewTransition: false,
      });
    } finally {
      if (ticket === asked.current) setSearching(false);
    }
  }, TYPING_PAUSE_MS);

  // Arriving by a link (the section nav, Back) starts the box from that address. The box's own
  // rewrites are told apart by `sent`, and a refresh of the page (the shell asks for one when a
  // game goes final) leaves the address alone, so neither disturbs the typing. The address is
  // the one being gone to, which the router holds before its page is read.
  const addressed = useRouterState({ select: (state) => readPlayersPage(state.location.search).q });
  useEffect(() => {
    if (addressed === sent.current) return;
    ask.cancel();
    asked.current++;
    setSearching(false);
    sent.current = addressed;
    typed.current = addressed;
    setText(addressed);
  }, [addressed, ask]);

  // Clearing the box clears the results at once; only a search waits for its answer, with the
  // answer before it left in place meanwhile.
  const wanted = text.trim();
  const search = wanted.length < MIN_SEARCH_LENGTH ? unansweredSearch(wanted) : initial;

  const onType = (value: string) => {
    typed.current = value;
    setText(value);
    void ask();
    // A cleared box is put in the address at once; only a search waits for a pause.
    if (value.trim().length < MIN_SEARCH_LENGTH) void ask.flush();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void ask.flush();
  };

  return (
    <>
      <search className="block max-md:mt-3">
        <form action="/players" method="get" onSubmit={submit}>
          <label
            htmlFor={inputId}
            className="block py-1 font-bold text-head text-label uppercase tracking-head"
          >
            player name
          </label>
          <input
            id={inputId}
            name="q"
            type="search"
            value={text}
            onChange={(event) => onType(event.target.value)}
            maxLength={MAX_SEARCH_LENGTH}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="two letters or more"
            // 16px on a phone, where a smaller field makes Safari zoom the page on focus.
            className={`w-full max-w-md appearance-none rounded-none border border-rule bg-transparent px-2 py-row text-base max-md:min-h-11 placeholder:text-aside md:text-body ${focusRing}`}
          />
        </form>
      </search>
      <div aria-busy={searching} className="mt-3">
        {/* Read out as the results change: the count or the message, never the whole table. */}
        <p
          role="status"
          className={
            search.status === "found" && search.players.length > 0
              ? "sr-only"
              : "font-serif text-prose text-note leading-[1.4]"
          }
        >
          {searchSummary(search)}
        </p>
        {search.players.length > 0 && (
          <PlayerLedger
            players={search.players}
            action={(player) => <FavoriteHeart kind="player" id={player.id} name={player.name} />}
          />
        )}
      </div>
    </>
  );
}

function searchSummary(search: Search): string {
  if (search.status === "idle") return "";
  if (search.status === "unavailable") return "Search is not answering. Try again shortly.";
  const found = search.players.length;
  if (found === 0) return `No player matches "${search.query}".`;
  return `${found} ${found === 1 ? "player" : "players"} found.`;
}
