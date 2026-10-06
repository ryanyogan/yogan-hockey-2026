/// <reference types="vite/client" />
import type { Endpoint } from "./endpoints.ts";
import { EspnFetchError } from "./errors.ts";

// Each recorded response is its own lazily loaded module, so a fixture costs nothing until it
// is asked for. This module is itself only imported in fixture mode and by tests.
const recorded = import.meta.glob<{ default: unknown }>("../fixtures/*.json");

/** The recorded ESPN response standing in for an endpoint. */
export async function loadFixture(endpoint: Endpoint): Promise<unknown> {
  const load = recorded[`../fixtures/${endpoint.fixture}.json`];
  if (!load) {
    throw new EspnFetchError(
      endpoint.name,
      null,
      `fixture mode has no recorded response fixtures/${endpoint.fixture}.json; add a sample of the endpoint to check/samples.ts and run pnpm record:fixtures`,
    );
  }
  return (await load()).default;
}
