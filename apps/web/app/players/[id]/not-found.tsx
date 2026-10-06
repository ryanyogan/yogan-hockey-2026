import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Player not found" };

/** An id ESPN has no player for: the same shell, and a way back to the search. */
export default function PlayerNotFound() {
  return (
    <Section>
      <SectionHeader title="Player not found" count="404" />
      <p className="border-foreground/20 border-t px-2 py-1.5">
        No player is kept at this address.{" "}
        <Link href="/players" className="font-bold underline">
          Back to players
        </Link>
      </p>
    </Section>
  );
}
