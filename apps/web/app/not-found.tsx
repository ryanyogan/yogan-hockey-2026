import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Not found" };

/** An unknown path, team or player: the same shell, and a way back. */
export default function NotFound() {
  return (
    <Section>
      <SectionHeader title="Not found" count="404" />
      <p className="border-foreground/20 border-t px-2 py-1.5">
        Nothing is kept at this address.{" "}
        <Link href="/" className="font-bold underline">
          Back to tonight
        </Link>
      </p>
    </Section>
  );
}
