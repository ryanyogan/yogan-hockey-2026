import { PageHeader } from "@yogan-hockey/ui/components/section";
import type { Metadata } from "next";
import { Link } from "../../../../components/link";

export const metadata: Metadata = { title: "Game not found" };

/** An id that is no NHL game's: the same shell, and a way back to the scores. */
export default function GameNotFound() {
  return (
    <section data-slot="not-found">
      <PageHeader title="Game not found" count="404" />
      <p className="pt-3 font-serif text-prose text-note leading-[1.4]">
        No game is kept at this address.{" "}
        <Link href="/nhl/live" className="tap-target font-strong underline">
          Live scores
        </Link>
      </p>
    </section>
  );
}
