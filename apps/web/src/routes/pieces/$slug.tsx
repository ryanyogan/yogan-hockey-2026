import { createFileRoute } from "@tanstack/react-router";
import { PiecePage } from "../../../components/piece/piece-page";
import { readPiecePage } from "../../functions/piece";
import { titled } from "../../head";

/**
 * `/pieces/:slug`: one written piece (#217), read whole. The slug is the piece's date and kind
 * ("2026-10-12-preview"), so a piece keeps its address after Home has moved on to the next day's.
 * An address that is no piece's is the site's not-found page, answered 404.
 */
export const Route = createFileRoute("/pieces/$slug")({
  loader: ({ params }) => readPiecePage({ data: { slug: params.slug } }),
  head: ({ match, loaderData }) => titled(match, loaderData?.headline),
  component: PieceRoute,
});

function PieceRoute() {
  return <PiecePage piece={Route.useLoaderData()} />;
}
