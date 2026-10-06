import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import type { Metadata } from "next";
import { Link } from "../../../../components/link";
import { nhlHref } from "../../../../lib/nhl-page";

export const metadata: Metadata = { title: "Team not found" };

/** An id that is no team's: the same shell, and a way back to the teams. */
export default function TeamNotFound() {
  return (
    <Section>
      <SectionHeader title="Team not found" count="404" />
      <p className="border-foreground/20 border-t px-2 py-1.5">
        No team is kept at this address.{" "}
        <Link href={nhlHref({ tab: "teams", view: "division" })} className="font-bold underline">
          All teams
        </Link>
      </p>
    </Section>
  );
}
