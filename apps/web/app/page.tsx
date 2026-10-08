import type { Metadata } from "next";
import { Dashboard } from "../components/dashboard/dashboard";
import { readSlatePicks } from "../lib/slate-picks";

export const metadata: Metadata = { title: "Dashboard" };

// Nothing here reads the request, and without this vinext would keep the first render for a year.
export const dynamic = "force-dynamic";

/**
 * `/`: the dashboard, with the picks of tonight's games and their season record from D1.
 *
 * Rendered per request, and not in the page cache: the slate drawn here arrives sooner than the
 * socket would bring it (spec section 2). It has no `loading.tsx`: with one (in a route group, so
 * as not to be every route's) it measured slower on a build, first load and click alike (#95).
 */
export default async function HomePage() {
  const { picks, record } = await readSlatePicks();
  return <Dashboard picks={picks} record={record} />;
}
