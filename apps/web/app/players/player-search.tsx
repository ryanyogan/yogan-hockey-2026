"use client";

import { useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useId, useRef, useState, useTransition } from "react";
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
  // What is in the box now, which may be more than was last asked.
  const typed = useRef(initial.query);
  const inputId = useId();

  const ask = useDebouncedCallback(() => {
    const ticket = ++asked.current;
    const query = typed.current.trim();
    // Before the call, not after: when the site has been deployed under an open tab, vinext
    // drops the action's answer and reloads the URL the action was called from.
    window.history.replaceState(null, "", searchHref(query));
    if (query.length < MIN_SEARCH_LENGTH) {
      setSearch({ status: "idle", query, players: [] });
      return;
    }
    startSearch(async () => {
      // No answer is a failed call: `undefined` from a tab older than the deploy (see above), or
      // a throw when the request never arrived.
      const answer = await searchPlayers(query).catch(() => undefined);
      if (answer) {
        if (ticket === asked.current) setSearch(answer);
        return;
      }
      // The same search by URL needs no action, so a stale tab recovers by loading it: whatever
      // is in the box by now, not what this call asked.
      if (navigator.onLine) window.location.assign(searchHref(typed.current));
      else if (ticket === asked.current) setSearch({ status: "unavailable", query, players: [] });
    });
  }, TYPING_PAUSE_MS);

  // Arriving by a link (the sidebar, Back) starts the box from that URL. The box's own rewrites
  // of the address match what is typed, and a refresh of the page (the shell asks for one when a
  // game goes final) leaves the address alone, so neither disturbs the typing.
  const urlQuery = (useSearchParams().get("q") ?? "").trim();
  useEffect(() => {
    if (urlQuery === typed.current.trim()) return;
    ask.cancel();
    asked.current++;
    typed.current = initial.query;
    setText(initial.query);
    setSearch(initial);
  }, [urlQuery, initial, ask]);

  const onType = (value: string) => {
    typed.current = value;
    setText(value);
    ask();
    // Clearing the box clears the results at once; only a search waits for a pause.
    if (value.trim().length < MIN_SEARCH_LENGTH) ask.flush();
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
            className="w-full max-w-md border border-foreground/20 bg-transparent px-2 py-1.5 text-base outline-none placeholder:text-foreground/40 focus-visible:border-foreground md:text-[13px]"
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
              : "px-2 text-foreground/70"
          }
        >
          {searchSummary(search)}
        </p>
        {search.players.length > 0 && <PlayerLedger players={search.players} />}
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
