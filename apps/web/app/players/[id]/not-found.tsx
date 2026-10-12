import { PageHeader } from "@yogan-hockey/ui/components/section";
import type { Metadata } from "next";
import { Link } from "../../../components/link";

export const metadata: Metadata = { title: "Player not found" };

/** An id ESPN has no player for: the same shell, and a way back to the search. */
export default function PlayerNotFound() {
  return (
    <section data-slot="not-found">
      <PageHeader title="Player not found" count="404" />
      <p className="pt-3 font-serif text-[17px] text-note leading-[1.4]">
        No player is kept at this address.{" "}
        <Link href="/players" className="font-strong underline">
          Back to players
        </Link>
      </p>
    </section>
  );
}
