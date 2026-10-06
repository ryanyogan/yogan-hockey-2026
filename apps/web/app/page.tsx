import type { Metadata } from "next";
import { Dashboard } from "../components/dashboard/dashboard";

export const metadata: Metadata = { title: "Tonight" };

// Nothing here reads the request, and without this vinext would keep the first render for a year.
export const dynamic = "force-dynamic";

/** `/`: the dashboard. */
export default function HomePage() {
  return <Dashboard />;
}
