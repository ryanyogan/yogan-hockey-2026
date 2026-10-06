import { redirect } from "next/navigation";
import { trackedPlayerHref } from "../../lib/tracked-players";

/** The Parity Reference's address for Rylan's page, kept for the links that point at it. */
export default function YoganPage() {
  redirect(trackedPlayerHref("rylan"));
}
