import { PageHeader } from "@yogan-hockey/ui/components/section";
import { nhlHref } from "../../lib/nhl-page";
import { Link } from "../link";
import { emptyProse } from "../story/type";

/** An id that is no team's: the same shell, and a way back to the teams. */
export function TeamNotFound() {
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
