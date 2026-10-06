import { Badge } from "@yogan-hockey/ui/components/badge";
import {
  Ledger,
  LedgerAside,
  LedgerBody,
  LedgerCell,
  LedgerColumn,
  LedgerDetail,
  LedgerHead,
  LedgerRow,
  ledgerRowLink,
} from "@yogan-hockey/ui/components/ledger";
import { FavoriteMarker, LiveMarker } from "@yogan-hockey/ui/components/marker";
import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import { UrlTabs } from "@yogan-hockey/ui/components/url-tabs";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Sample ledger" };

/*
 * Scaffolding for #38: every packages/ui primitive on one page, laid out as the Reference UI's
 * dashboard so the two can be compared in screenshots (docs/design/shell). All of it is invented;
 * the real pages replace it.
 */

type Game = {
  id: string;
  status: string;
  live?: boolean;
  away: [abbr: string, record: string, score?: number];
  home: [abbr: string, record: string, score?: number];
  pick?: string;
  favorite?: boolean;
};

const games: Game[] = [
  {
    id: "1",
    status: "2nd 12:34",
    live: true,
    away: ["TOR", "2-0-0", 2],
    home: ["MTL", "1-1-0", 1],
    favorite: true,
  },
  {
    id: "2",
    status: "1st 04:10",
    live: true,
    away: ["CHI", "1-1-0", 0],
    home: ["DET", "0-2-0", 0],
    favorite: true,
  },
  {
    id: "3",
    status: "7:00 PM",
    away: ["BOS", "1-0-1"],
    home: ["NYR", "2-0-0"],
    pick: "Rangers 58%",
  },
  {
    id: "4",
    status: "10:00 PM",
    away: ["EDM", "1-1-0"],
    home: ["VAN", "1-0-1"],
    pick: "Oilers 54%",
  },
  { id: "5", status: "final", away: ["FLA", "2-1-0", 4], home: ["TB", "1-2-0", 2] },
  { id: "6", status: "final/OT", away: ["COL", "2-0-1", 2], home: ["DAL", "2-1-0", 3] },
];

const family = [
  {
    name: "Rylan Yogan",
    team: "Falcons Peewee A2",
    detail: "W 4-2 vs Jets · Next: Sat 9:15 AM at Huskies",
    totals: [6, 3, 5, 8],
  },
];

const favorites = [
  { name: "Auston Matthews", team: "TOR", line: "2 GP · 3 G · 1 A", live: true },
  { name: "Connor Bedard", team: "CHI", line: "2 GP · 1 G · 2 A", live: true },
  { name: "Connor McDavid", team: "EDM", line: "2 GP · 0 G · 4 A", live: false },
  { name: "Cale Makar", team: "COL", line: "3 GP · 1 G · 3 A", live: false },
];

const standings: [abbr: string, w: number, l: number, otl: number, pts: number][] = [
  ["TOR", 2, 0, 0, 4],
  ["NYR", 2, 0, 0, 4],
  ["FLA", 2, 1, 0, 4],
  ["BOS", 1, 0, 1, 3],
  ["MTL", 1, 1, 0, 2],
  ["CHI", 1, 1, 0, 2],
  ["TB", 1, 2, 0, 2],
  ["DET", 0, 2, 0, 0],
];

const views = ["league", "division", "conference", "wild card"].map((view) => ({
  value: view,
  label: view,
  href: `?view=${encodeURIComponent(view)}`,
}));

export default async function SampleLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const requested = (await searchParams).view;
  const view = views.find((candidate) => candidate.value === requested)?.value ?? "league";

  return (
    <>
      <Section>
        <SectionHeader title="Tonight" count="6 games, 2 live">
          picks: 34 right, 21 wrong
        </SectionHeader>
        <Ledger>
          <LedgerHead>
            <LedgerColumn>status</LedgerColumn>
            <LedgerColumn>away</LedgerColumn>
            <LedgerColumn numeric />
            <LedgerColumn>home</LedgerColumn>
            <LedgerColumn numeric />
            <LedgerColumn>note</LedgerColumn>
          </LedgerHead>
          <LedgerBody>
            {games.map((game) => (
              <LedgerRow key={game.id} live={game.live} interactive>
                <LedgerCell>
                  <Link href="/skeleton/ledger" className={ledgerRowLink}>
                    {game.live ? (
                      <LiveMarker strong className="text-foreground underline">
                        {game.status}
                      </LiveMarker>
                    ) : (
                      game.status
                    )}
                  </Link>
                </LedgerCell>
                <LedgerCell>
                  {game.away[0]} <LedgerAside>{game.away[1]}</LedgerAside>
                </LedgerCell>
                <LedgerCell tone="score">{game.away[2]}</LedgerCell>
                <LedgerCell>
                  {game.home[0]} <LedgerAside>{game.home[1]}</LedgerAside>
                </LedgerCell>
                <LedgerCell tone="score">{game.home[2]}</LedgerCell>
                <LedgerCell tone="note">
                  {game.pick ? `pick: ${game.pick}` : null}
                  {game.favorite ? <FavoriteMarker>favorite team</FavoriteMarker> : null}
                </LedgerCell>
              </LedgerRow>
            ))}
          </LedgerBody>
        </Ledger>
      </Section>

      <div className="grid gap-8 xl:grid-cols-2">
        <Section>
          <SectionHeader title="Family" />
          <Ledger>
            <LedgerHead>
              <LedgerColumn>player</LedgerColumn>
              <LedgerColumn>team</LedgerColumn>
              <LedgerColumn numeric>gp</LedgerColumn>
              <LedgerColumn numeric>g</LedgerColumn>
              <LedgerColumn numeric>a</LedgerColumn>
              <LedgerColumn numeric>pts</LedgerColumn>
            </LedgerHead>
            <LedgerBody>
              {family.map((player) => (
                <LedgerRow key={player.name} className="align-top">
                  <LedgerCell className="font-bold underline">{player.name}</LedgerCell>
                  <LedgerCell>
                    {player.team}
                    <LedgerDetail>{player.detail}</LedgerDetail>
                  </LedgerCell>
                  {player.totals.map((total, column) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: fixed columns of sample data
                    <LedgerCell key={column} numeric>
                      {total}
                    </LedgerCell>
                  ))}
                </LedgerRow>
              ))}
            </LedgerBody>
          </Ledger>
        </Section>

        <Section>
          <SectionHeader title="Favorites" />
          <Ledger>
            <LedgerHead>
              <LedgerColumn>player</LedgerColumn>
              <LedgerColumn>team</LedgerColumn>
              <LedgerColumn>season</LedgerColumn>
              <LedgerColumn />
            </LedgerHead>
            <LedgerBody>
              {favorites.map((favorite) => (
                <LedgerRow key={favorite.name}>
                  <LedgerCell>{favorite.name}</LedgerCell>
                  <LedgerCell>{favorite.team}</LedgerCell>
                  <LedgerCell tone="note">{favorite.line}</LedgerCell>
                  <LedgerCell>{favorite.live ? <LiveMarker /> : null}</LedgerCell>
                </LedgerRow>
              ))}
            </LedgerBody>
          </Ledger>
        </Section>

        <Section>
          <SectionHeader title="Standings" count={view} />
          <Ledger density="compact">
            <LedgerHead>
              <LedgerColumn>#</LedgerColumn>
              <LedgerColumn>team</LedgerColumn>
              <LedgerColumn numeric>w</LedgerColumn>
              <LedgerColumn numeric>l</LedgerColumn>
              <LedgerColumn numeric>otl</LedgerColumn>
              <LedgerColumn numeric>pts</LedgerColumn>
            </LedgerHead>
            <LedgerBody>
              {standings.map(([abbr, w, l, otl, pts], index) => (
                <LedgerRow key={abbr}>
                  <LedgerCell tone="aside">{index + 1}</LedgerCell>
                  <LedgerCell>{abbr}</LedgerCell>
                  <LedgerCell numeric>{w}</LedgerCell>
                  <LedgerCell numeric>{l}</LedgerCell>
                  <LedgerCell numeric>{otl}</LedgerCell>
                  <LedgerCell numeric tone="strong">
                    {pts}
                  </LedgerCell>
                </LedgerRow>
              ))}
            </LedgerBody>
          </Ledger>
        </Section>

        <Section>
          <SectionHeader title="Primitives" count="not in the Reference UI" />
          <div className="space-y-3 border-foreground/20 border-t px-2 pt-3">
            <UrlTabs label="Standings view" link={Link} current={view} tabs={views} />
            <p className="flex flex-wrap items-center gap-2">
              <Badge>final</Badge>
              <Badge variant="secondary">sample</Badge>
              <Badge variant="outline">ot</Badge>
              <Badge variant="live">live</Badge>
            </p>
          </div>
        </Section>
      </div>
    </>
  );
}
