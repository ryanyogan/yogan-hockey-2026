/**
 * The binding that exists only under Vitest (see vitest.config.ts). `wrangler types` writes the
 * Worker's bindings under two names, `Env` and `Cloudflare.Env`, and the Agents are checked
 * against both, so the binding is added to both.
 */
interface TestBindings {
  TEST_MIGRATIONS: import("cloudflare:test").D1Migration[];
}
interface Env extends TestBindings {}
declare namespace Cloudflare {
  interface Env extends TestBindings {}
}
