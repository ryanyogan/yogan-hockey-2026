import { PageHeader } from "@yogan-hockey/ui/components/section";
import type { Metadata } from "next";
import { Link } from "../../../../components/link";
import { emptyProse } from "../../../../components/story/type";
import { nhlHref } from "../../../../lib/nhl-page";

export const metadata: Metadata = { title: "Team not found" };

/** An id that is no team's: the same shell, and a way back to the teams. */
export default function TeamNotFound() {
  return (
    <div>
      <PageHeader title="Team not found" count="404" />
      <p className={`${emptyProse} max-md:mt-3`}>
        No team is kept at this address.{" "}
        <Link
          href={nhlHref({ tab: "teams", view: "division" })}
          className="tap-target font-strong underline"
        >
          All teams
        </Link>
      </p>
    </div>
  );
}
