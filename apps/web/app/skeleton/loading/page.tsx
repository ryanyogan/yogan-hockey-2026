import {
  NextGameSkeleton,
  RosterSkeleton,
  ScheduleSkeleton,
  TeamStatsSkeleton,
} from "../../../components/team/team-skeletons";

export const metadata = { title: "Loading states" };

/**
 * The team page's placeholders, held still: on the site each is replaced within moments, too
 * soon to look at or to take a screenshot of (`docs/design/performance/`). A sample page, like
 * its neighbours under `/skeleton`; add a route's placeholders here when it gains them.
 */
export default function LoadingStatesPage() {
  return (
    <>
      <div className="grid gap-8 xl:grid-cols-2">
        <TeamStatsSkeleton />
        <NextGameSkeleton />
      </div>
      <ScheduleSkeleton />
      <RosterSkeleton />
    </>
  );
}
