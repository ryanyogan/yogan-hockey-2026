import { PageHeader } from "@yogan-hockey/ui/components/section";
import type { Metadata } from "next";
import { PROSE } from "../../../../components/agate-type";
import { Link } from "../../../../components/link";
import { nhlHref } from "../../../../lib/nhl-page";

export const metadata: Metadata = { title: "Team not found" };

/** An id that is no team's: the same shell, and a way back to the teams. */
export default function TeamNotFound() {
  return (
    <div>
      <PageHeader title="Team not found" count="404" />
      <p className={`max-md:mt-3 ${PROSE}`}>
        No team is kept at this address.{" "}
        <Link href={nhlHref({ tab: "teams", view: "division" })} className="font-strong underline">
          All teams
        </Link>
      </p>
    </div>
  );
}
