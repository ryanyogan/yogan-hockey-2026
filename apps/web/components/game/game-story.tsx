"use client";

import type { GameHeader } from "@yogan-hockey/schemas";
import { deck, headline } from "../../lib/agate-copy";
import { OnTv, StoryKicker, StoryLineScore, useZone } from "../story/story-parts";
import { storyDeck, storyHeadline, storyRule } from "../story/type";

/**
 * The top of a game's page, written as a story of the roundup is (`docs/design/agate.md`): a heavy
 * rule, red while the game is on; the kicker; the headline, which is the page's title; the deck;
 * and the line score beside them, under them on a phone. The parts and their type are a lead's on
 * Home (`components/story`), with two things more: each club's mark in the line score, the one
 * place the page's header draws them, and the shots. Every sentence is `lib/agate-copy.ts`'s, read
 * from the header alone, so it moves with the Game Stream as the rink under it does.
 *
 * A start time is the NHL's zone on the server ("8:40 PM ET") and the visitor's own once the page
 * has hydrated (`useZone`), as `LocalTime` writes one.
 */
export function GameStory({ header }: { header: GameHeader }) {
  const zone = useZone();
  return (
    <header
      data-slot="game-story"
      data-live={header.status === "live" ? "" : undefined}
      className={`mb-6 grid items-start gap-x-8 gap-y-3 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] ${storyRule}`}
    >
      <div className="flex min-w-0 flex-col gap-3">
        <StoryKicker game={header} zone={zone} />
        <h1 data-slot="headline" className={storyHeadline}>
          {headline(header)}
        </h1>
        <p data-slot="deck" className={storyDeck}>
          {deck(header)}
        </p>
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <StoryLineScore game={header} marks />
        <OnTv broadcasts={header.broadcasts} />
      </div>
    </header>
  );
}
