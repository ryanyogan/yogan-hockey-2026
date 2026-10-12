import { createServerFn } from "@tanstack/react-start";
import { readSlatePicks, type SlatePicks } from "../../lib/slate-picks";
import { pageRead } from "./page-read";

/**
 * `/nhl/live`'s one read: each game's pick in one line, from D1. Today's games are not read here:
 * they are the root route's, and then the socket's. The picks are an extra (`readSlatePicks`
 * never rejects), so the page is drawn without them when they cannot be read.
 */
export const readLive = createServerFn({ method: "GET" }).handler(() =>
  pageRead<SlatePicks>(() => readSlatePicks()),
);
