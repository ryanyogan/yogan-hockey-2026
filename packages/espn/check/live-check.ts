/**
 * The daily live ESPN check (spec section 10): fetch each endpoint the site reads, live, and run
 * the site's own translation on it. It is the early warning for ESPN changing shape, since
 * nothing watches the site while nobody is on it.
 */
import { ScoreboardSchema, TeamSchema } from "@yogan-hockey/schemas";
import { z } from "zod";
import { fetchJson } from "../src/client.ts";
import { endpoints } from "../src/endpoints.ts";
import { EspnFetchError, EspnParseError } from "../src/errors.ts";
import { SAMPLES, type Sample, SLATE_STATUSES, secondTeam, summariesFromSlate } from "./samples.ts";

/** How many times an endpoint is fetched before a fetch failure is believed. */
const TRIES = 3;
/** The wait before the second try; the wait before the third is twice it. */
const RETRY_WAIT_MS = 2000;
/** Zod reports every wrong field; past this many different ones the rest are counted, not listed. */
const ISSUES_LISTED = 20;

/** What became of one endpoint. */
export const CheckResultSchema = z.object({
  /** The endpoint as errors and alerts name it, such as `teams/21/schedule`. */
  endpoint: z.string(),
  url: z.string(),
  /**
   * `parse-failure`: ESPN answered and the answer is not the shape the site reads, which is what
   * this check exists to catch. `fetch-failure`: ESPN, or the network, did not give an answer.
   */
  outcome: z.enum(["ok", "parse-failure", "fetch-failure"]),
  /** How many times the endpoint was fetched. */
  attempts: z.number().int().positive(),
  /** The HTTP status of a fetch failure; null when there was no response, and for the rest. */
  status: z.number().int().nullable(),
  /** The error's own message; empty for a pass. */
  message: z.string(),
  /** For a parse failure, where in the response it is: `path.to.field: what is wrong`. */
  issues: z.array(z.string()),
});
export type CheckResult = z.infer<typeof CheckResultSchema>;

/**
 * The machine-readable summary of one run: `scripts/check-live.ts` writes it as JSON and
 * `scripts/report-check.ts` reads it back.
 */
export const CheckSummarySchema = z.object({
  ok: z.boolean(),
  checkedAt: z.iso.datetime(),
  results: z.array(CheckResultSchema),
  /** What this run could not look at, and why. Not failures. */
  notChecked: z.array(z.string()),
});
export type CheckSummary = z.infer<typeof CheckSummarySchema>;

export type LiveCheckOptions = {
  fetch?: typeof fetch;
  /** Waits between tries. */
  sleep?: (ms: number) => Promise<unknown>;
  now?: () => Date;
};

/**
 * Where a parse failed, a line for each field: `path.to.field: what is wrong`. A field that is
 * wrong the same way in many rows of a list is one line, with the list's index written `[]` and
 * the first place named in full: when ESPN changes a roster every player's row fails, and thirty
 * lines of one field would push the other fields that changed past the limit.
 */
function issuesOf(error: unknown): string[] {
  const cause = error instanceof Error ? error.cause : undefined;
  if (!(cause instanceof z.ZodError)) return [];
  const fields = new Map<string, { first: string; places: number }>();
  for (const issue of cause.issues) {
    const everyRow = issue.path
      .map((key) => (typeof key === "number" ? "[]" : `.${String(key)}`))
      .join("")
      .replace(/^\./, "");
    const key = `${everyRow || "(root)"}: ${issue.message}`;
    const field = fields.get(key);
    if (field) field.places++;
    else fields.set(key, { first: issue.path.join(".") || "(root)", places: 1 });
  }
  const lines = [...fields].map(([line, { first, places }]) =>
    places === 1
      ? `${first}${line.slice(line.indexOf(": "))}`
      : `${line} (${places} places, first at ${first})`,
  );
  const more = lines.length - ISSUES_LISTED;
  return more > 0 ? [...lines.slice(0, ISSUES_LISTED), `and ${more} more`] : lines;
}

/**
 * A 4xx is ESPN's answer and will not change. No response, a 5xx, a 429 and a response that broke
 * off part way may all be different on the next try.
 */
function worthAnotherTry(error: EspnFetchError): boolean {
  const { status } = error;
  return status === null || status === 429 || status < 400 || status >= 500;
}

/**
 * A body that is not JSON at all: an error page from ESPN or something in front of it. That is
 * ESPN being down, not ESPN changing shape, though the client calls both an `EspnParseError`.
 */
function notJson(error: unknown): error is EspnParseError {
  return error instanceof EspnParseError && error.cause instanceof SyntaxError;
}

/** Fetches and translates one sample. Answers the translated value too, for the caller to read. */
async function checkOne(
  sample: Sample,
  fetcher: typeof fetch,
  sleep: (ms: number) => Promise<unknown>,
): Promise<{ result: CheckResult; value: unknown }> {
  const { name: endpoint, url } = sample.endpoint;
  const passed: Omit<CheckResult, "attempts"> = {
    endpoint,
    url,
    outcome: "ok",
    status: null,
    message: "",
    issues: [],
  };
  for (let attempts = 1; ; attempts++) {
    try {
      const value = sample.translate(await fetchJson(sample.endpoint, fetcher));
      return { result: { ...passed, attempts }, value };
    } catch (error) {
      if (error instanceof EspnFetchError || notJson(error)) {
        if (attempts < TRIES && (notJson(error) || worthAnotherTry(error))) {
          await sleep(RETRY_WAIT_MS * attempts);
          continue;
        }
        const result: CheckResult = {
          ...passed,
          outcome: "fetch-failure",
          attempts,
          status: error instanceof EspnFetchError ? error.status : null,
          message: error.message,
        };
        return { result, value: undefined };
      }
      // Anything else the translation throws means the response was not what the code expects,
      // whether Zod caught it (an `EspnParseError`) or the translating code tripped on it.
      const message =
        error instanceof EspnParseError
          ? error.message
          : `ESPN ${endpoint} could not be translated: ${error instanceof Error ? error.message : String(error)}`;
      const result: CheckResult = {
        ...passed,
        outcome: "parse-failure",
        attempts,
        message,
        issues: issuesOf(error),
      };
      return { result, value: undefined };
    }
  }
}

/**
 * Runs the check: every sample in `samples.ts`, then what is chosen from today's slate: the
 * summaries of a live, a scheduled and a final game, and a second team. Every endpoint is checked
 * whatever became of the ones before it.
 */
export async function runLiveCheck(options: LiveCheckOptions = {}): Promise<CheckSummary> {
  const fetcher = options.fetch ?? fetch;
  const sleep =
    options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const checkedAt = (options.now?.() ?? new Date()).toISOString();

  const results: CheckResult[] = [];
  const notChecked: string[] = [];
  /** What each sample that passed translated to, by its URL. */
  const translated = new Map<string, unknown>();

  for (const sample of SAMPLES) {
    const { result, value } = await checkOne(sample, fetcher, sleep);
    results.push(result);
    if (result.outcome === "ok") translated.set(sample.endpoint.url, value);
  }

  const fromTodaysSlate: Sample[] = [];
  const slate = translated.get(endpoints.scoreboard().url);
  if (slate === undefined) {
    notChecked.push(
      "the summaries of games on today's slate, and a second team: today's scoreboard failed",
    );
  } else {
    // The translations have just promised these shapes; parsing again is how the types are
    // known here.
    const { games } = ScoreboardSchema.parse(slate);
    fromTodaysSlate.push(...summariesFromSlate(games));
    for (const status of SLATE_STATUSES) {
      if (!games.some((game) => game.status === status)) {
        notChecked.push(`the summary of a ${status} game: none on today's slate`);
      }
    }
    const teams = translated.get(endpoints.teams().url);
    const chosen = secondTeam(
      games,
      teams === undefined
        ? null
        : z
            .array(TeamSchema)
            .parse(teams)
            .map((team) => team.id),
    );
    if ("sample" in chosen) fromTodaysSlate.push(chosen.sample);
    else notChecked.push(chosen.gap);
  }
  for (const sample of fromTodaysSlate) {
    results.push((await checkOne(sample, fetcher, sleep)).result);
  }

  return { ok: results.every((result) => result.outcome === "ok"), checkedAt, results, notChecked };
}

/** " (3 tries)" for a result that took more than one, for the end of its message. */
export function triesNote(result: CheckResult): string {
  return result.attempts > 1 ? ` (${result.attempts} tries)` : "";
}

function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

/** The run as text, for a terminal and the workflow's log: a line per endpoint, the verdict last. */
export function describeCheck(summary: CheckSummary): string {
  const lines: string[] = [];
  for (const result of summary.results) {
    if (result.outcome === "ok") {
      lines.push(`ok    ${result.endpoint}`);
      continue;
    }
    lines.push(`${result.outcome === "parse-failure" ? "PARSE" : "FETCH"} ${result.endpoint}`);
    lines.push(`        ${result.url}`);
    if (result.issues.length === 0) lines.push(`        ${result.message}${triesNote(result)}`);
    for (const issue of result.issues) lines.push(`        ${issue}`);
  }
  for (const gap of summary.notChecked) lines.push(`not checked: ${gap}`);

  const total = count(summary.results.length, "endpoint");
  if (summary.ok) return `${[...lines, `ESPN check passed: ${total}.`].join("\n")}\n`;
  const parse = summary.results.filter((result) => result.outcome === "parse-failure").length;
  const fetched = summary.results.filter((result) => result.outcome === "fetch-failure").length;
  const kinds = [
    parse > 0 ? `${count(parse, "parse failure")} (ESPN changed shape)` : "",
    fetched > 0 ? `${count(fetched, "fetch failure")} (ESPN or the network was down)` : "",
  ].filter(Boolean);
  return `${[...lines, `ESPN check FAILED: ${kinds.join(", ")}, of ${total}.`].join("\n")}\n`;
}
