import { createServerFn } from "@tanstack/react-start";
import { type PicksPage, readPicksPage as read } from "../../lib/picks-page";
import { pageRead } from "./page-read";

/**
 * `/picks`'s one read: the season's figures, tonight's picks and the columns, all from D1
 * (`lib/picks-page.ts`, which never rejects: each part the page can be drawn without).
 */
export const readPicksPage = createServerFn({ method: "GET" }).handler(() =>
  pageRead<PicksPage>(() => read()),
);
