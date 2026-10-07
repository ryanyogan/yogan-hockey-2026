"use client";

import {
  Ledger,
  LedgerBody,
  LedgerCell,
  LedgerColumn,
  LedgerHead,
  LedgerRow,
} from "@yogan-hockey/ui/components/ledger";
import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import { useSyncExternalStore } from "react";
import type { ScheduleRow } from "../../lib/tracked-players";
import { stillToCome, todayUtc } from "../../lib/tracked-schedule";

const never = () => () => {};

/**
 * The games to come. The server lists every game without a result, and the browser leaves out
 * one whose day has passed: the page's HTML then depends on his file alone, which is what lets
 * the page cache keep it (spec section 2). The file is edited by hand, and an old date must not
 * stay listed as upcoming.
 */
export function UpcomingSection({ rows }: { rows: ScheduleRow[] }) {
  // Null on the server and while hydrating, which draw every row; today's date after that.
  const today = useSyncExternalStore(never, todayUtc, () => null);
  const upcoming = today == null ? rows : stillToCome(rows, today);
  const count = upcoming.length;
  if (count === 0) return null;
  return (
    <Section>
      <SectionHeader title="Upcoming" count={`${count} ${count === 1 ? "game" : "games"}`} />
      <Ledger density="compact">
        <LedgerHead>
          <LedgerColumn>date</LedgerColumn>
          <LedgerColumn className="w-full">opp</LedgerColumn>
        </LedgerHead>
        <LedgerBody>
          {upcoming.map((row) => (
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
