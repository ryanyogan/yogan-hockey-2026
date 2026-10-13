import type { z } from "zod";

const ISSUES_SHOWN = 5;

function describeIssues(error: z.ZodError): string {
  const shown = error.issues
    .slice(0, ISSUES_SHOWN)
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
  const hidden = error.issues.length - shown.length;
  return hidden > 0 ? `${shown.join("; ")}; and ${hidden} more` : shown.join("; ");
}

/**
 * ESPN answered, and the answer is not the shape this package reads. ESPN's API is unofficial,
 * so this is the error that says it has changed.
 */
export class EspnParseError extends Error {
  override readonly name = "EspnParseError";
  /** The endpoint that failed to parse, such as `teams/21/schedule`. */
  readonly endpoint: string;

  constructor(endpoint: string, cause: z.ZodError | SyntaxError) {
    const detail = cause instanceof SyntaxError ? cause.message : describeIssues(cause);
    super(`ESPN ${endpoint} did not parse: ${detail}`, { cause });
    this.endpoint = endpoint;
  }
}

/**
 * ESPN did not answer, or answered with an error status, or answered that it has no such thing
 * (`EspnNotFoundError`, below). `notFound` tells the last from the rest.
 */
export class EspnFetchError extends Error {
  override readonly name = "EspnFetchError";
  readonly endpoint: string;
  /** The HTTP status, or null when there was no response at all. */
  readonly status: number | null;

  constructor(endpoint: string, status: number | null, reason: string, options?: ErrorOptions) {
    super(`ESPN ${endpoint} could not be fetched: ${reason}`, options);
    this.endpoint = endpoint;
    this.status = status;
  }

  /**
   * ESPN has no such team, player or game. It says so with a 404, with a 400 (a team's schedule,
   * an id too long to be an athlete's), or with a 200 that has nothing in it (`EspnNotFoundError`).
   */
  get notFound(): boolean {
    return this.status === 400 || this.status === 404;
  }
}

/**
 * ESPN answered 200, and what it sent says it has no such thing: `{}` for a team id no team has.
 * A fetch error like its 404 for an unknown player, so one test (`notFound`) covers every way
 * ESPN says it, and a response the site cannot read stays an `EspnParseError`.
 */
export class EspnNotFoundError extends EspnFetchError {
  constructor(endpoint: string, reason: string) {
    super(endpoint, 200, reason);
    // It was fetched: what the parent's sentence says of it would be untrue.
    this.message = `ESPN ${endpoint}: ${reason}`;
  }

  override get notFound(): boolean {
    return true;
  }
}
