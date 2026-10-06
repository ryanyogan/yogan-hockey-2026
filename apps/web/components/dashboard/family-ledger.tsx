import {
  Ledger,
  LedgerBody,
  LedgerCell,
  LedgerColumn,
  LedgerDetail,
  LedgerHead,
  LedgerRow,
  ledgerRowLink,
} from "@yogan-hockey/ui/components/ledger";
import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import { FAMILY_COLUMNS, familyTotals } from "../../lib/dashboard";
import type { FamilyRow } from "../../lib/tracked-players";
import { Link } from "../link";

/**
 * The dashboard's Family block: a row for each Tracked Player with his club, his last game under
 * it and his season's totals, leading to his page.
 */
export function FamilyLedger({ rows }: { rows: readonly FamilyRow[] }) {
  // One season between them is said once, beside the title.
  const seasons = new Set(rows.map((row) => row.season));
  const [season] = seasons.size === 1 ? seasons : [];
  return (
    <Section aria-label="Family">
      <SectionHeader title="Family" count={season ?? undefined} />
      <Ledger>
        <LedgerHead>
          <LedgerColumn>player</LedgerColumn>
          <LedgerColumn>team</LedgerColumn>
          {FAMILY_COLUMNS.map((column) => (
            <LedgerColumn key={column} numeric>
              {column}
            </LedgerColumn>
          ))}
        </LedgerHead>
        <LedgerBody>
          {rows.map((row) => (
            <LedgerRow key={row.slug} interactive className="align-top">
              <LedgerCell tone="strong">
                <Link href={row.href} className={`${ledgerRowLink} underline`}>
                  {row.name}
                </Link>
              </LedgerCell>
              <LedgerCell>
                {row.team}
                {row.lastGame && <LedgerDetail>{row.lastGame}</LedgerDetail>}
              </LedgerCell>
              {familyTotals(row.totals).map((total) => (
                <LedgerCell key={total.label} numeric>
                  {total.value}
                </LedgerCell>
              ))}
            </LedgerRow>
          ))}
        </LedgerBody>
      </Ledger>
    </Section>
  );
}
