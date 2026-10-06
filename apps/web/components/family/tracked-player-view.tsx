import type { TrackedPlayer, TrackedTeam } from "@yogan-hockey/schemas";
import {
  Ledger,
  LedgerBody,
  LedgerCell,
  LedgerColumn,
  LedgerHead,
  LedgerRow,
} from "@yogan-hockey/ui/components/ledger";
import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import { UrlTabs } from "@yogan-hockey/ui/components/url-tabs";
import Link from "next/link";
import { playerHref } from "../../lib/roster";
import {
  careerOf,
  headerOf,
  type ScheduleView,
  scheduleOf,
  seasonOf,
  TRACKED_TABS,
  type TrackedTab,
  trackedPlayerHref,
} from "../../lib/tracked-players";
import {
  CareerSection,
  HeaderLine,
  SeasonSection,
  StatCells,
  StatColumn,
} from "../players/player-sections";

/*
 * A Tracked Player's page, in the player page's language and from its parts: the same header
 * line, the same ledgers. Everything drawn comes from his static file: nothing is read from ESPN
 * or from a store.
 */

/** The games to come: a day and an opponent, and nothing about where or when. */
function UpcomingSection({ schedule }: { schedule: ScheduleView }) {
  const count = schedule.upcoming.length;
  return (
    <Section>
      <SectionHeader title="Upcoming" count={`${count} ${count === 1 ? "game" : "games"}`} />
      <Ledger density="compact">
        <LedgerHead>
          <LedgerColumn>date</LedgerColumn>
          <LedgerColumn className="w-full">opp</LedgerColumn>
        </LedgerHead>
        <LedgerBody>
          {schedule.upcoming.map((row) => (
            <LedgerRow key={row.key}>
              <LedgerCell className="whitespace-nowrap">{row.date}</LedgerCell>
              <LedgerCell className="whitespace-nowrap">{row.opponent}</LedgerCell>
            </LedgerRow>
          ))}
        </LedgerBody>
      </Ledger>
    </Section>
  );
}

/** The games played, newest first, each with his line: a player page's Games, leading nowhere. */
function ResultsSection({ schedule }: { schedule: ScheduleView }) {
  const count = schedule.results.length;
  return (
    <Section>
      <SectionHeader title="Games" count={schedule.season}>
        {count} {count === 1 ? "game" : "games"}
      </SectionHeader>
      <Ledger density="compact">
        <LedgerHead>
          <LedgerColumn>date</LedgerColumn>
          <LedgerColumn>opp</LedgerColumn>
          <LedgerColumn>result</LedgerColumn>
          {schedule.columns.map((column) => (
            <StatColumn key={column.name} column={column} />
          ))}
        </LedgerHead>
        <LedgerBody>
          {schedule.results.map((row) => (
            <LedgerRow key={row.key}>
              <LedgerCell className="whitespace-nowrap">{row.date}</LedgerCell>
              <LedgerCell className="whitespace-nowrap">{row.opponent}</LedgerCell>
              <LedgerCell className="whitespace-nowrap">{row.result}</LedgerCell>
              <StatCells columns={schedule.columns} values={row.values} />
            </LedgerRow>
          ))}
        </LedgerBody>
      </Ledger>
    </Section>
  );
}

/** His club: its name under a rule, where a player page has the row that leads to an NHL team. */
function ClubSection({ team }: { team: TrackedTeam }) {
  return (
    <Section>
      <SectionHeader title="Team" />
      <Ledger>
        <LedgerBody>
          <LedgerRow className="border-t border-t-foreground/20">
            <LedgerCell>{team.name}</LedgerCell>
          </LedgerRow>
        </LedgerBody>
      </Ledger>
    </Section>
  );
}

export function TrackedPlayerView({ player, tab }: { player: TrackedPlayer; tab: TrackedTab }) {
  const header = headerOf(player);
  const season = seasonOf(player);
  const career = careerOf(player);
  const schedule = scheduleOf(player);

  return (
    <>
      <div>
        <HeaderLine name={header.name} detail={header.detail} facts={header.facts} />
        {player.note && (
          <p data-slot="tracked-note" className="px-2 pt-1 text-[10px] text-foreground/50">
            {player.note}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <UrlTabs
          label={player.name}
          link={Link}
          current={tab}
          tabs={TRACKED_TABS.map((value) => ({
            value,
            label: value,
            href: trackedPlayerHref(player.slug, value),
          }))}
        />
        <div className="space-y-8">
          {tab === "stats" ? (
            <>
              {season && <SeasonSection season={season} />}
              {career && <CareerSection career={career} />}
              {!season && !career && <p className="px-2 text-foreground/70">No stats yet.</p>}
            </>
          ) : schedule && schedule.upcoming.length + schedule.results.length > 0 ? (
            <>
              {schedule.upcoming.length > 0 && <UpcomingSection schedule={schedule} />}
              {schedule.results.length > 0 && <ResultsSection schedule={schedule} />}
            </>
          ) : (
            <p className="px-2 text-foreground/70">No games yet.</p>
          )}
        </div>
      </div>
      {player.team && <ClubSection team={player.team} />}
      {player.projection && (
        <p className="px-2">
          <Link href={playerHref({ id: player.projection.playerId })} className="underline">
            {player.projection.label}
          </Link>
        </p>
      )}
    </>
  );
}
