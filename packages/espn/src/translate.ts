import { z } from "zod";
import type { Endpoint } from "./endpoints.ts";
import { EspnParseError } from "./errors.ts";

/**
 * The one path from an ESPN response to one of the site's shapes: parse what ESPN sent, translate
 * it, and check the result is the shape promised. A failure at either end is an `EspnParseError`
 * naming the endpoint.
 */
export function translateResponse<Espn extends z.ZodType, Ours extends z.ZodType>(
  endpoint: Endpoint,
  json: unknown,
  espnShape: Espn,
  ourShape: Ours,
  translate: (response: z.output<Espn>) => z.input<Ours>,
): z.output<Ours> {
  try {
    return ourShape.parse(translate(espnShape.parse(json)));
  } catch (error) {
    if (error instanceof z.ZodError) throw new EspnParseError(endpoint.name, error);
    throw error;
  }
}
