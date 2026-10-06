"use client";

import { type FormEvent, useId, useRef, useState, useTransition } from "react";
import { useDebouncedCallback } from "use-debounce";
import { PlayerLedger } from "../../components/players/player-ledger";
import { MAX_SEARCH_LENGTH, MIN_SEARCH_LENGTH, searchHref } from "../../lib/player-search";
import type { PlayerSearch as Search } from "../../lib/players";
import { searchPlayers } from "./actions";

/** How long the visitor must pause before what he has typed is searched for. */
const TYPING_PAUSE_MS = 250;

/**
 * The search box. The page renders the search named in the URL and hands it over as `initial`;
 * from then on each pause in typing asks the `searchPlayers` Server Action and writes the search
 * into the address bar, so the page can be reloaded, pasted or linked at any point.
 *
 * Without JavaScript it is a plain form that loads `/players?q=...`.
 */
export function PlayerSearch({ initial }: { initial: Search }) {
  const [text, setText] = useState(initial.query);
  const [search, setSearch] = useState(initial);
  const [searching, startSearch] = useTransition();
  // Answers can arrive out of order; only the answer to the latest question is shown.
  const asked = useRef(0);
  const inputId = useId();

  const ask = useDebouncedCallback((typed: string) => {
    const ticket = ++asked.current;
    const query = typed.trim();
    const href = searchHref(query);
    // Before the call, not after: when the site has been deployed under an open tab, vinext
    // drops the action's answer and reloads the URL the action was called from.
    window.history.replaceState(null, "", href);
    if (query.length < MIN_SEARCH_LENGTH) {
      setSearch({ status: "idle", query, players: [] });
      return;
    }
    startSearch(async () => {
      // No answer is a failed call: `undefined` from a tab older than the deploy (see above), or
      // a throw when the request never arrived.
      const answer = await searchPlayers(query).catch(() => undefined);
      if (ticket !== asked.current) return;
      if (answer) setSearch(answer);
      // The same search by URL needs no action, so a stale tab recovers by loading it.
      else if (navigator.onLine) window.location.assign(href);
      else setSearch({ status: "unavailable", query, players: [] });
    });
  }, TYPING_PAUSE_MS);

  const type = (typed: string) => {
    setText(typed);
    ask(typed);
    // Clearing the box clears the results at once; only a search waits for a pause.
    if (typed.trim().length < MIN_SEARCH_LENGTH) ask.flush();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    ask.flush();
  };

  return (
    <>
      <search className="block px-2">
        <form action="/players" method="get" onSubmit={submit}>
          <label
            htmlFor={inputId}
            className="block py-1 text-[10px] text-foreground/50 uppercase tracking-wider"
          >
            name
          </label>
          <input
            id={inputId}
            name="q"
            type="search"
            value={text}
            onChange={(event) => type(event.target.value)}
            maxLength={MAX_SEARCH_LENGTH}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="two letters or more"
            // 16px on a phone, where a smaller field makes Safari zoom the page on focus.
            className="w-full max-w-md border border-foreground/20 bg-transparent px-2 py-1.5 text-base outline-none placeholder:text-foreground/40 focus-visible:border-foreground md:text-[13px]"
          />
        </form>
      </search>
      <div aria-live="polite" aria-busy={searching} className="mt-3">
        <SearchAnswer search={search} />
      </div>
    </>
  );
}

function SearchAnswer({ search }: { search: Search }) {
  if (search.status === "idle") return null;
  if (search.status === "unavailable") {
    return <p className="px-2 text-foreground/70">Search is not answering. Try again shortly.</p>;
  }
  if (search.players.length === 0) {
    return <p className="px-2 text-foreground/70">No player matches "{search.query}".</p>;
  }
  return <PlayerLedger players={search.players} />;
}
