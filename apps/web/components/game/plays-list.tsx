import type { GameHeader, Play } from "@yogan-hockey/schemas";
import { tabCellHoldsFocus, tabCellVariants, tabStrip } from "@yogan-hockey/ui/components/url-tabs";
import type { ReactNode } from "react";
import { markKind, playTime, scoringPlays, teamAbbreviation } from "../../lib/game/plays";

/** One play as a row that can be clicked: when, whose, what. A goal is bold and red. */
function PlayRow({
  header,
  play,
  focused,
  picked,
  onSelect,
  note,
}: {
  header: GameHeader;
  play: Play;
  focused: boolean;
  picked: boolean;
  onSelect: (playId: string) => void;
  /** Quiet text after the play: the score a goal made. */
  note?: ReactNode;
}) {
  return (
    <button
      type="button"
      data-slot="play-row"
      data-play={play.id}
      aria-pressed={picked}
      onClick={() => onSelect(play.id)}
      className={`flex w-full cursor-pointer gap-2 border-border border-b px-2 py-row text-left outline-none max-md:min-h-11 max-md:items-center hover:bg-highlight focus-visible:ring-2 focus-visible:ring-ring ${
        focused ? "bg-highlight" : ""
      }`}
    >
      <span className="w-[9ch] shrink-0 text-label">{playTime(play)}</span>
      <span className="w-[4ch] shrink-0">{teamAbbreviation(header, play.teamId)}</span>
      <span className={markKind(play) === "goal" ? "font-strong text-live" : ""}>
        {play.text}
        {note != null && <span className="font-quiet text-label"> {note}</span>}
      </span>
    </button>
  );
}

type ListProps = {
  header: GameHeader;
  /** The play in focus, whose row is tinted: the picked play, or the latest. */
  focusId: string | null;
  /** The play the visitor picked, if any. */
  selectedId: string | null;
  onSelect: (playId: string) => void;
};

/** The plays, newest first, in two columns where there is room for them. */
export function PlaysList({
  header,
  plays,
  focusId,
  selectedId,
  onSelect,
}: ListProps & {
  /** The plays to list, in the game's order: the Key plays, or every play. */
  plays: readonly Play[];
}) {
  if (plays.length === 0) return <p className="text-label">No plays yet.</p>;
  return (
    <div data-slot="plays-list" className="@container">
      <div className="grid gap-x-8 border-rule-head border-t @3xl:grid-cols-2">
        {plays.toReversed().map((play) => (
          <PlayRow
            key={play.id}
            header={header}
            play={play}
            focused={play.id === focusId}
            picked={play.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

/** The choice between the Key plays and every play, with how many each is. */
export function KeyPlaysToggle({
  everyPlay,
  onChange,
  keyCount,
  totalCount,
}: {
  everyPlay: boolean;
  onChange: (everyPlay: boolean) => void;
  keyCount: number;
  totalCount: number;
}) {
  const choices = [
    { value: false, label: "key plays", count: keyCount },
    { value: true, label: "every play", count: totalCount },
  ];
  return (
    <fieldset data-slot="key-plays-toggle" className={tabStrip}>
      <legend className="sr-only">Which plays to show</legend>
      {choices.map((choice) => (
        <label
          key={choice.label}
          className={`${tabCellHoldsFocus} ${tabCellVariants({
            current: choice.value === everyPlay,
          })}`}
        >
          <input
            type="radio"
            name="plays-shown"
            className="sr-only"
            checked={choice.value === everyPlay}
            onChange={() => onChange(choice.value)}
            // A click as well: one made before the page hydrates checks the radio without telling
            // React, and the next click on it then changes nothing for `onChange` to hear.
            onClick={() => onChange(choice.value)}
          />
          {choice.label} <span className="ml-[1ch] opacity-70">{choice.count}</span>
        </label>
      ))}
    </fieldset>
  );
}

/**
 * The goals in order, each with the score it made, and then the shootout's, which made none.
 * `plays` is every play so far.
 */
export function ScoringSummary({
  header,
  plays,
  focusId,
  selectedId,
  onSelect,
}: ListProps & { plays: readonly Play[] }) {
  const { goals, shootout } = scoringPlays(plays);
  if (goals.length + shootout.length === 0) {
    return <p className="text-label">No goals yet.</p>;
  }
  const { home, away } = header;
  return (
    <div data-slot="scoring-summary" className="max-w-4xl">
      {goals.map((play) => (
        <PlayRow
          key={play.id}
          header={header}
          play={play}
          focused={play.id === focusId}
          picked={play.id === selectedId}
          onSelect={onSelect}
          note={`${away.abbreviation} ${play.awayScore}, ${home.abbreviation} ${play.homeScore}`}
        />
      ))}
      {shootout.length > 0 && (
        <>
          <h3 className="mt-4 mb-1 font-strong uppercase">Shootout</h3>
          {shootout.map((play) => (
            <PlayRow
              key={play.id}
              header={header}
              play={play}
              focused={play.id === focusId}
              picked={play.id === selectedId}
              onSelect={onSelect}
            />
          ))}
        </>
      )}
    </div>
  );
}
