import type { PlayerProfile, Team } from "@yogan-hockey/schemas";
import {
  Ledger,
  LedgerAside,
  LedgerBody,
  LedgerCell,
  LedgerColumn,
  LedgerHead,
  LedgerRow,
  ledgerRowLink,
} from "@yogan-hockey/ui/components/ledger";
import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  bioFacts,
  type CareerView,
  type GameLogView,
  type SeasonView,
  type ShownColumn,
} from "../../lib/player-view";

/*
 * The parts of a player page, in the ledger's language: a header line, then one dense table per
 * subject. Each takes what `lib/player-view.ts` works out, so a player who is not ESPN's (the
 * Tracked Player's page, and the fictional player, of #46) is drawn by the same parts.
 */

const teamHref = (teamId: string) => `/nhl/teams/${teamId}`;

/** A stat column's heading, spelled out for a pointer and a screen reader where it is known. */
function StatColumn({ column }: { column: ShownColumn }) {
  return (
    <LedgerColumn numeric className="whitespace-nowrap">
      {column.title ? (
        <abbr title={column.title} className="no-underline">
          {column.label}
        </abbr>
      ) : (
        column.label
      )}
    </LedgerColumn>
  );
}

/** The cells of one row of stats. Points are the key figure of a row that has them. */
function StatCells({
  columns,
  values,
}: {
  columns: readonly ShownColumn[];
  values: readonly string[];
}) {
  return columns.map((column, index) => (
    <LedgerCell key={column.name} numeric tone={column.name === "points" ? "strong" : "default"}>
      {values[index]}
    </LedgerCell>
  ));
}

/**
 * The header line: his name, then position, number and team in quiet text, then the facts ESPN
 * has about him. `action` sits at the right end of the line, which is where #45's heart goes.
 * There is no photo: the page is drawn to read without one.
 */
export function PlayerHeader({ profile, action }: { profile: PlayerProfile; action?: ReactNode }) {
  const facts = bioFacts(profile);
  return (
    <header data-slot="player-header">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-4">
        <h1 className="font-bold text-base uppercase">
          {profile.name}
          <span className="font-normal text-[13px] text-foreground/50 normal-case max-sm:block">
            {" "}
            {profile.positionName ?? profile.position}
            {profile.jersey ? ` · #${profile.jersey}` : null}
            {profile.team ? (
              <>
                {" · "}
                <Link href={teamHref(profile.team.id)} className="underline">
                  {profile.team.name}
                </Link>
              </>
            ) : null}
          </span>
        </h1>
        {action}
      </div>
      {facts.length > 0 && (
        <dl className="flex flex-wrap gap-x-6 gap-y-1 border-foreground/20 border-t px-2 py-1">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-[10px] text-foreground/50 uppercase tracking-wider">
                {fact.label}
              </dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </header>
  );
}

/** "Tied-47th" as the ledger has room for it. */
const shortRank = (rank: string) => rank.replace(/^Tied-/, "T-");

/** The current season: one line of figures and, where ESPN ranks them, his place in the league. */
export function SeasonSection({ season }: { season: SeasonView }) {
  const ranked = season.stats.some((stat) => stat.rank !== null);
  return (
    <Section>
      <SectionHeader title="Season" count={season.season} />
      <Ledger>
        <LedgerHead>
          <LedgerColumn />
          {season.stats.map((stat) => (
            <LedgerColumn key={stat.label} numeric className="whitespace-nowrap">
              {stat.label}
            </LedgerColumn>
          ))}
          {/* Takes the spare width, so a handful of figures sit together at the left. */}
          <LedgerColumn className="w-full" />
        </LedgerHead>
        <LedgerBody>
          <LedgerRow>
            <LedgerCell tone="note" className="whitespace-nowrap">
              totals
            </LedgerCell>
            {season.stats.map((stat) => (
              <LedgerCell
                key={stat.label}
                numeric
                tone={stat.label === "PTS" ? "strong" : "default"}
              >
                {stat.value}
              </LedgerCell>
            ))}
            <LedgerCell />
          </LedgerRow>
          {ranked && (
            <LedgerRow>
              <LedgerCell tone="note" className="whitespace-nowrap">
                league rank
              </LedgerCell>
              {season.stats.map((stat) => (
                <LedgerCell key={stat.label} numeric tone="note" className="whitespace-nowrap">
                  {stat.rank ? shortRank(stat.rank) : null}
                </LedgerCell>
              ))}
              <LedgerCell />
            </LedgerRow>
          )}
        </LedgerBody>
      </Ledger>
    </Section>
  );
}

/** The career table, newest season first, with the career's totals as its last row. */
export function CareerSection({ career }: { career: CareerView }) {
  return (
    <Section>
      <SectionHeader
        title="Career"
        count={`${career.seasonCount} ${career.seasonCount === 1 ? "season" : "seasons"}`}
      >
        {career.headline.map((stat) => `${stat.value} ${stat.label}`).join(" · ")}
      </SectionHeader>
      <Ledger density="compact">
        <LedgerHead>
          <LedgerColumn>season</LedgerColumn>
          <LedgerColumn>team</LedgerColumn>
          {career.columns.map((column) => (
            <StatColumn key={column.name} column={column} />
          ))}
        </LedgerHead>
        <LedgerBody>
          {career.rows.map((row) => (
            <LedgerRow key={row.key}>
              <LedgerCell className="whitespace-nowrap">{row.season}</LedgerCell>
              {row.team ? (
                <LedgerCell>
                  <Link href={teamHref(row.team.id)} prefetch={false} className="hover:underline">
                    {row.team.abbreviation}
                  </Link>
                </LedgerCell>
              ) : (
                <LedgerCell tone="note">total</LedgerCell>
              )}
              <StatCells columns={career.columns} values={row.values} />
            </LedgerRow>
          ))}
          {career.totals && (
            // The rule above the totals is drawn on the cells: a row's own top rule loses to the
            // rule under the row before it.
            <LedgerRow className="font-bold [&>td]:border-foreground/20 [&>td]:border-t">
              <LedgerCell colSpan={2}>career</LedgerCell>
              <StatCells columns={career.columns} values={career.totals} />
            </LedgerRow>
          )}
        </LedgerBody>
      </Ledger>
    </Section>
  );
}

/**
 * His latest games, each row leading to the game. `allHref` and `latestHref` switch between the
 * latest few and the whole season, when there are more than the few.
 */
export function GameLogSection({
  log,
  allHref,
  latestHref,
}: {
  log: GameLogView;
  allHref: string;
  latestHref?: string;
}) {
  const shown = log.rows.length;
  return (
    <Section id="games">
      <SectionHeader title="Games" count={log.season}>
        {shown < log.gameCount ? (
          <>
            latest {shown} of {log.gameCount} ·{" "}
            <Link href={allHref} className="underline">
              show all
            </Link>
          </>
        ) : (
          <>
            {log.gameCount} {log.gameCount === 1 ? "game" : "games"}
            {latestHref && (
              <>
                {" · "}
                <Link href={latestHref} className="underline">
                  show latest
                </Link>
              </>
            )}
          </>
        )}
      </SectionHeader>
      <Ledger density="compact">
        <LedgerHead>
          <LedgerColumn>date</LedgerColumn>
          <LedgerColumn>opp</LedgerColumn>
          <LedgerColumn>result</LedgerColumn>
          {log.columns.map((column) => (
            <StatColumn key={column.name} column={column} />
          ))}
        </LedgerHead>
        <LedgerBody>
          {log.rows.map((row) => (
            <LedgerRow key={row.gameId} interactive>
              <LedgerCell className="whitespace-nowrap">
                <Link href={`/nhl/games/${row.gameId}`} prefetch={false} className={ledgerRowLink}>
                  {row.date}
                </Link>
              </LedgerCell>
              <LedgerCell className="whitespace-nowrap">{row.opponent}</LedgerCell>
              <LedgerCell className="whitespace-nowrap">{row.result}</LedgerCell>
              <StatCells columns={log.columns} values={row.values} />
            </LedgerRow>
          ))}
        </LedgerBody>
      </Ledger>
    </Section>
  );
}

/** His club, leading to its page: the Parity Reference's Current Team card, as a ledger row. */
export function TeamSection({ team }: { team: Team }) {
  return (
    <Section>
      <SectionHeader title="Team" />
      <Ledger>
        <LedgerBody>
          <LedgerRow interactive className="border-t border-t-foreground/20">
            <LedgerCell>
              <Link href={teamHref(team.id)} className={ledgerRowLink}>
                {team.name}
              </Link>{" "}
              <LedgerAside>{team.abbreviation}</LedgerAside>
            </LedgerCell>
            <LedgerCell numeric tone="note" className="max-sm:hidden">
              schedule, roster and stats
            </LedgerCell>
          </LedgerRow>
        </LedgerBody>
      </Ledger>
    </Section>
  );
}
