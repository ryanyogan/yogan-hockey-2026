import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "../../components/dashboard/dashboard";
import { readHome } from "../functions/home";
import { titled } from "../head";

/**
 * `/`: Home, the roundup of tonight's games with their picks and the season's record from D1,
 * over the standings and the picks (`components/dashboard/dashboard.tsx`).
 *
 * Today's games are the root route's read and then the socket's; this route reads the rest.
 */
export const Route = createFileRoute("/")({
  loader: () => readHome(),
  // No title of its own: Home is the site, so its title is the site's name.
  head: ({ match }) => titled(match),
  component: HomePage,
});

function HomePage() {
  const { picks, record, standings } = Route.useLoaderData();
  return <Dashboard picks={picks} record={record} standings={standings} />;
}
