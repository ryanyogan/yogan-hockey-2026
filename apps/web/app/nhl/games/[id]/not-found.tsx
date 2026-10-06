import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import type { Metadata } from "next";
import { Link } from "../../../../components/link";

export const metadata: Metadata = { title: "Game not found" };

/** An id that is no NHL game's: the same shell, and a way back to the scores. */
export default function GameNotFound() {
  return (
    <Section>
      <SectionHeader title="Game not found" count="404" />
      <p className="border-foreground/20 border-t px-2 py-1.5">
        No game is kept at this address.{" "}
        <Link href="/nhl/live" className="font-bold underline">
          Live scores
        </Link>
      </p>
    </Section>
  );
}
