import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import type { Metadata } from "next";
import { Link } from "../components/link";

export const metadata: Metadata = { title: "Not found" };

/** An unknown path, team or player: the same shell, and a way back. */
export default function NotFound() {
  return (
    <Section>
      <SectionHeader title="Not found" count="404" />
      <p className="border-rule-head border-t px-2 py-row">
        Nothing is kept at this address.{" "}
        <Link href="/" className="tap-target font-strong underline">
          Back to tonight
        </Link>
      </p>
    </Section>
  );
}
