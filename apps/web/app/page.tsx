import type { Metadata } from "next";
import { Dashboard } from "../components/dashboard/dashboard";
import { readSlatePicks } from "../lib/slate-picks";

export const metadata: Metadata = { title: "Tonight" };

// Nothing here reads the request, and without this vinext would keep the first render for a year.
export const dynamic = "force-dynamic";

/** `/`: the dashboard, with the picks of tonight's games and their season record from D1. */
export default async function HomePage() {
  const { picks, record } = await readSlatePicks();
  return <Dashboard picks={picks} record={record} />;
}
