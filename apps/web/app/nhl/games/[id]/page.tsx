import { guardGamePage } from "../../../../lib/game-route";
import { pageNotFound } from "../../../../lib/page-not-found";
export const dynamic = "force-dynamic";
/** Tab contents follow the retained game's playhead; the leaf guards cacheability on every request. */
export default async function GameTabPage({ params }: { params: Promise<{ id: string }> }) {
  const found = await guardGamePage((await params).id);
  if (found.state === "missing") pageNotFound();
  return null;
}
