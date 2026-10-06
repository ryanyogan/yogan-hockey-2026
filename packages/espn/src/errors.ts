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

/** ESPN did not answer, or answered with an error status. */
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

  /** ESPN has no such team (or other thing asked for by id). It says so with a 400, not a 404. */
  get notFound(): boolean {
    return this.status === 400 || this.status === 404;
  }
}
