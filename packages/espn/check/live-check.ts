/**
 * The daily live ESPN check (spec section 10): fetch each endpoint the site reads, live, and run
 * the site's own translation on it. It is the early warning for ESPN changing shape, since
 * nothing watches the site while nobody is on it.
 */
import { ScoreboardSchema } from "@yogan-hockey/schemas";
import { z } from "zod";
import { fetchJson } from "../src/client.ts";
import { endpoints } from "../src/endpoints.ts";
import { EspnFetchError, EspnParseError } from "../src/errors.ts";
import { SAMPLES, type Sample, unfinishedSummaries } from "./samples.ts";

/** How many times an endpoint is fetched before a fetch failure is believed. */
const TRIES = 3;
/** The wait before the second try; the wait before the third is twice it. */
const RETRY_WAIT_MS = 2000;
/** Zod reports every wrong field; past this many the rest are counted, not listed. */
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

function issuesOf(error: unknown): string[] {
  const cause = error instanceof Error ? error.cause : undefined;
  if (!(cause instanceof z.ZodError)) return [];
  const listed = cause.issues
    .slice(0, ISSUES_LISTED)
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
  const more = cause.issues.length - listed.length;
  return more > 0 ? [...listed, `and ${more} more`] : listed;
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
 * Runs the check: every sample in `samples.ts`, then the summaries of a live and a scheduled game
 * chosen from today's slate. Every endpoint is checked whatever became of the ones before it.
 */
export async function runLiveCheck(options: LiveCheckOptions = {}): Promise<CheckSummary> {
  const fetcher = options.fetch ?? fetch;
  const sleep =
    options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const checkedAt = (options.now?.() ?? new Date()).toISOString();

  const results: CheckResult[] = [];
  const notChecked: string[] = [];
  const todaysSlate = endpoints.scoreboard().url;
  let fromTodaysSlate: Sample[] = [];

  for (const sample of SAMPLES) {
    const { result, value } = await checkOne(sample, fetcher, sleep);
    results.push(result);
    if (sample.endpoint.url !== todaysSlate) continue;
    if (result.outcome !== "ok") {
      notChecked.push("the summary of a live or scheduled game: today's scoreboard failed");
      continue;
    }
    // The translation has just promised this shape; parsing it again is how the type is known here.
    const { games } = ScoreboardSchema.parse(value);
    fromTodaysSlate = unfinishedSummaries(games);
    for (const status of ["live", "scheduled"] as const) {
      if (!games.some((game) => game.status === status)) {
        notChecked.push(`the summary of a ${status} game: none on today's slate`);
      }
    }
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
