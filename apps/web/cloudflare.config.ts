import { bindings, defineConfig, defineWorker, exports } from "cf/config";
// Importing the entry as a module, not naming it by path, is what types `env.SkeletonAgent`.
import * as entrypoint from "./worker.ts" with { type: "cf-worker" };

const NAME = "yogan-hockey";
// A placeholder until account setup (#32) creates the real database. `cf d1 migrations apply`
// accepts only an id, and local dev keys its simulated database by it.
const LOCAL_D1_ID = "00000000-0000-4000-8000-000000000031";

export default defineConfig({
  worker: defineWorker({
    name: NAME,
    entrypoint,
    compatibilityDate: "2026-10-06",
    compatibilityFlags: ["nodejs_compat"],
    assets: { notFoundHandling: "none" },
    observability: { enabled: true },
    exports: {
      SkeletonAgent: exports.durableObject({ storage: "sqlite" }),
    },
    env: {
      ASSETS: bindings.assets(),
      // The disposable cache behind vinext's data cache (kvDataAdapter's default binding name).
      VINEXT_KV_CACHE: bindings.kv(),
      // The permanent record. Real ids arrive with account setup (#32).
      DB: bindings.d1({ id: LOCAL_D1_ID, name: "yogan-hockey" }),
      SkeletonAgent: bindings.durableObject({ worker: NAME, exportName: "SkeletonAgent" }),
    },
  }),
});
