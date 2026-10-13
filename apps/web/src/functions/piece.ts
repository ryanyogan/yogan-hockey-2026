import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type { Piece } from "@yogan-hockey/schemas";
import { z } from "zod";
import { readPiece } from "../../lib/home-pieces";
import { pageRead } from "./page-read";

/**
 * `/pieces/:slug`'s one read: the published piece at the slug as the address has it. An address
 * that is no piece's (`readPiece` says which those are) is the page's 404.
 */
export const readPiecePage = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string() }))
  .handler(({ data }) =>
    pageRead<Piece>(async () => {
      const piece = await readPiece(data.slug);
      if (piece == null) throw notFound();
      return piece;
    }),
  );
