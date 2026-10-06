import type { GameHeader, GameHeaderSide, Pregame, PregameSide } from "@yogan-hockey/schemas";
import {
  Ledger,
  LedgerBody,
  LedgerCell,
  LedgerColumn,
  LedgerHead,
  LedgerRow,
} from "@yogan-hockey/ui/components/ledger";
import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import Link from "next/link";
import type { ReactNode } from "react";
import { goalieRecord, lastFiveLine, savePct, standingLine } from "../../lib/game/matchup";
import { playerHref } from "../../lib/roster";
import { gameHref } from "../../lib/scoreboard-view";
import { LocalTime } from "../local-time";
import { teamHref } from "../nhl/team-name";
import { EmptyLedger } from "../team/empty-ledger";

type Side = { team: GameHeaderSide; facts: PregameSide };

const figure = (value: number | null, digits = 0) => (value == null ? "-" : value.toFixed(digits));

function TeamCell({ team }: { team: GameHeaderSide }) {
  return (
    <LedgerCell tone="strong">
      <Link href={teamHref(team)} className="underline-offset-2 hover:underline">
        {team.abbreviation}
      </Link>
    </LedgerCell>
  );
}

function Player({ id, children }: { id: string; children: ReactNode }) {
  return (
    <Link href={playerHref({ id })} prefetch={false} className="underline-offset-2 hover:underline">
      {children}
    </Link>
  );
}

/** Each team going in: record, splits, where it sits, and its last five. */
function Teams({ sides }: { sides: Side[] }) {
  return (
    <Section>
      <SectionHeader title="Matchup" count="away, then home" />
      <Ledger>
        <LedgerHead>
          <LedgerColumn>team</LedgerColumn>
          <LedgerColumn numeric>record</LedgerColumn>
          <LedgerColumn numeric className="max-sm:hidden">
            home
          </LedgerColumn>
          <LedgerColumn numeric className="max-sm:hidden">
            road
          </LedgerColumn>
          <LedgerColumn numeric>pts</LedgerColumn>
          <LedgerColumn className="pl-6">standing</LedgerColumn>
          <LedgerColumn className="w-full">last five</LedgerColumn>
        </LedgerHead>
        <LedgerBody>
          {sides.map(({ team, facts }) => (
            <LedgerRow key={team.id}>
              <TeamCell team={team} />
              <LedgerCell numeric className="whitespace-nowrap">
                {facts.record.overall ?? team.record ?? "-"}
              </LedgerCell>
              <LedgerCell numeric className="whitespace-nowrap max-sm:hidden">
                {facts.record.home ?? "-"}
              </LedgerCell>
              <LedgerCell numeric className="whitespace-nowrap max-sm:hidden">
                {facts.record.road ?? "-"}
              </LedgerCell>
              <LedgerCell numeric>{facts.standing?.points ?? "-"}</LedgerCell>
              <LedgerCell className="whitespace-nowrap pl-6">
                {standingLine(facts.standing)}
              </LedgerCell>
              <LedgerCell className="whitespace-nowrap">{lastFiveLine(facts.lastFive)}</LedgerCell>
            </LedgerRow>
          ))}
        </LedgerBody>
      </Ledger>
    </Section>
  );
}

function Goalies({ sides }: { sides: Side[] }) {
  const rows = sides.flatMap(({ team, facts }) =>
    facts.goalies.map((goalie) => ({ team, goalie })),
  );
  return (
    <Section>
      <SectionHeader title="Goalies" />
      {rows.length === 0 ? (
        <EmptyLedger>ESPN lists goalies only before the game.</EmptyLedger>
      ) : (
        <Ledger>
          <LedgerHead>
            <LedgerColumn>team</LedgerColumn>
            <LedgerColumn>goalie</LedgerColumn>
            <LedgerColumn numeric>gp</LedgerColumn>
            <LedgerColumn numeric>record</LedgerColumn>
            <LedgerColumn numeric>gaa</LedgerColumn>
            <LedgerColumn numeric>sv%</LedgerColumn>
            <LedgerColumn className="w-full p-0" />
          </LedgerHead>
          <LedgerBody>
            {rows.map(({ team, goalie }) => (
              <LedgerRow key={goalie.athleteId}>
                <TeamCell team={team} />
                <LedgerCell className="whitespace-nowrap">
                  <Player id={goalie.athleteId}>{goalie.name}</Player>
                </LedgerCell>
                <LedgerCell numeric>{figure(goalie.gamesPlayed)}</LedgerCell>
                <LedgerCell numeric className="whitespace-nowrap">
                  {goalieRecord(goalie)}
                </LedgerCell>
                <LedgerCell numeric>{figure(goalie.goalsAgainstAverage, 2)}</LedgerCell>
                <LedgerCell numeric>{savePct(goalie.savePct)}</LedgerCell>
                <LedgerCell className="p-0" />
              </LedgerRow>
            ))}
          </LedgerBody>
        </Ledger>
      )}
    </Section>
  );
}

function Leaders({ sides }: { sides: Side[] }) {
  const rows = sides.flatMap(({ team, facts }) =>
    facts.leaders.map((leader) => ({ team, leader })),
  );
  return (
    <Section>
      <SectionHeader title="Leaders" />
      {rows.length === 0 ? (
        <EmptyLedger>No leaders yet this season.</EmptyLedger>
      ) : (
        <Ledger>
          <LedgerHead>
            <LedgerColumn>team</LedgerColumn>
            <LedgerColumn>in</LedgerColumn>
            <LedgerColumn numeric />
            <LedgerColumn className="w-full">player</LedgerColumn>
          </LedgerHead>
          <LedgerBody>
            {rows.map(({ team, leader }) => (
              <LedgerRow key={`${team.id}-${leader.category}`}>
                <TeamCell team={team} />
                <LedgerCell tone="note">{leader.category}</LedgerCell>
                <LedgerCell numeric tone="strong">
                  {leader.value}
                </LedgerCell>
                <LedgerCell>
                  <Player id={leader.athleteId}>{leader.name}</Player>
                </LedgerCell>
              </LedgerRow>
            ))}
          </LedgerBody>
        </Ledger>
      )}
    </Section>
  );
}

function Injuries({ sides }: { sides: Side[] }) {
  const rows = sides.flatMap(({ team, facts }) =>
    facts.injuries.map((injury) => ({ team, injury })),
  );
  return (
    <Section>
      <SectionHeader title="Injuries" count={rows.length === 0 ? undefined : rows.length} />
      {rows.length === 0 ? (
        <EmptyLedger>Nobody is listed as out.</EmptyLedger>
      ) : (
        <Ledger>
          <LedgerHead>
            <LedgerColumn>team</LedgerColumn>
            <LedgerColumn>player</LedgerColumn>
            <LedgerColumn>status</LedgerColumn>
            <LedgerColumn className="w-full max-sm:hidden">with</LedgerColumn>
          </LedgerHead>
          <LedgerBody>
            {rows.map(({ team, injury }) => (
              <LedgerRow key={injury.athleteId}>
                <TeamCell team={team} />
                <LedgerCell className="whitespace-nowrap">
                  <Player id={injury.athleteId}>{injury.name}</Player>
                </LedgerCell>
                <LedgerCell tone="note" className="whitespace-nowrap">
                  {injury.status.toLowerCase()}
                </LedgerCell>
                <LedgerCell tone="note" className="max-sm:hidden">
                  {[injury.type, injury.detail].filter((part) => part != null).join(", ") || "-"}
                </LedgerCell>
              </LedgerRow>
            ))}
          </LedgerBody>
        </Ledger>
      )}
    </Section>
  );
}

function SeasonSeries({ gameId, series }: { gameId: string; series: Pregame["seasonSeries"] }) {
  return (
    <Section>
      <SectionHeader title="Season series" count={series?.summary.toLowerCase()} />
      {series == null || series.games.length === 0 ? (
        <EmptyLedger>These teams have no other game this season.</EmptyLedger>
      ) : (
        <Ledger>
          <LedgerHead>
            <LedgerColumn>day</LedgerColumn>
            <LedgerColumn>game</LedgerColumn>
            <LedgerColumn className="w-full" />
          </LedgerHead>
          <LedgerBody>
            {series.games.map((game) => {
              const played = game.status === "final";
              const side = (team: (typeof game)["home"]) =>
                played ? `${team.abbreviation} ${team.score}` : team.abbreviation;
              const line = `${side(game.away)} at ${side(game.home)}`;
              return (
                <LedgerRow key={game.gameId}>
                  <LedgerCell className="whitespace-nowrap">
                    <LocalTime at={game.startTime} show="day" />
                  </LedgerCell>
                  <LedgerCell tone={played ? "strong" : "default"} className="whitespace-nowrap">
                    {game.gameId === gameId ? (
                      line
                    ) : (
                      <Link
                        href={gameHref({ id: game.gameId })}
                        prefetch={false}
                        className="underline-offset-2 hover:underline"
                      >
                        {line}
                      </Link>
                    )}
                  </LedgerCell>
                  <LedgerCell tone="aside">
                    {game.gameId === gameId ? "this game" : played ? "final" : ""}
                  </LedgerCell>
                </LedgerRow>
              );
            })}
          </LedgerBody>
        </Ledger>
      )}
    </Section>
  );
}

/**
 * The matchup facts under a scheduled game's rink, visitors first as everywhere on the site:
 * the two teams going in, then goalies, leaders, injuries and the season series.
 */
export function GameMatchup({ header, pregame }: { header: GameHeader; pregame: Pregame }) {
  const sides: Side[] = [
    { team: header.away, facts: pregame.away },
    { team: header.home, facts: pregame.home },
  ];
  return (
    <>
      <Teams sides={sides} />
      <div className="grid gap-8 xl:grid-cols-2">
        <Goalies sides={sides} />
        <Leaders sides={sides} />
        <Injuries sides={sides} />
        <SeasonSeries gameId={header.id} series={pregame.seasonSeries} />
      </div>
    </>
  );
}
