/** Finds the model's words in what the binding answered: the models answer in two shapes. */
function answerOf(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  // The plain Workers AI shape. In JSON mode `response` is already an object.
  if ("response" in raw && raw.response != null) return raw.response;
  // The OpenAI chat shape.
  if ("choices" in raw && Array.isArray(raw.choices)) {
    const [choice] = raw.choices as { message?: { content?: unknown } }[];
    return choice?.message?.content ?? null;
  }
  return raw;
}

/** The JSON object in a model's text, which may be wrapped in a code fence or a sentence. */
function jsonIn(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * The JSON value a model answered with, whichever shape the binding gave it in, or null when
 * there is none. Nothing is repaired beyond finding the JSON: the caller's schema decides whether
 * it counts.
 */
export function jsonAnswer(raw: unknown): unknown {
  const answer = answerOf(raw);
  return typeof answer === "string" ? jsonIn(answer) : answer;
}
