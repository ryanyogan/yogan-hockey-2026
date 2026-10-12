import { PageHeader } from "@yogan-hockey/ui/components/section";
import { Link } from "../link";

/** An id ESPN has no player for: the same shell, and a way back to the search. */
export function PlayerNotFound() {
  return (
    <section data-slot="not-found">
      <PageHeader title="Player not found" count="404" />
      <p className="pt-3 font-serif text-prose text-note leading-[1.4]">
        No player is kept at this address.{" "}
        <Link href="/players" className="tap-target font-strong underline">
          Back to players
        </Link>
      </p>
    </section>
  );
}
