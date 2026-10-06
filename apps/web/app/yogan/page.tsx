import { redirect } from "next/navigation";
import { trackedPlayerHref } from "../../lib/tracked-players";

// Without this a production build would cache the page for a year (see the build notes).
export const dynamic = "force-dynamic";

/** The Parity Reference's address for Rylan's page, kept for the links that point at it. */
export default function YoganPage() {
  redirect(trackedPlayerHref("rylan"));
}
