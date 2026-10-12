import { PageHeader } from "@yogan-hockey/ui/components/section";
import { Link } from "../link";

/** An unknown path, team or player: the same shell, and a way back. */
export function NotFoundPage() {
  return (
    <section data-slot="not-found">
      <PageHeader title="Not found" count="404" />
      <p className="pt-3 font-serif text-prose text-note leading-[1.4]">
        Nothing is kept at this address.{" "}
        <Link href="/" className="tap-target font-strong underline">
          Back to tonight
        </Link>
      </p>
    </section>
  );
}
