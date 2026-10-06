import { bindings, defineConfig, defineWorker, exports } from "cf/config";
// The KV and D1 ids account setup (#32) recorded. The deploy workflows read the same file.
import resources from "./cloudflare.resources.json" with { type: "json" };
import { deployTarget } from "./lib/deploy-target.ts";
// Importing the entry as a module, not naming it by path, is what types `env.SkeletonAgent`.
import * as entrypoint from "./worker.ts" with { type: "cf-worker" };

const NAME = "yogan-hockey";

export default defineConfig({
  worker: defineWorker((build) => {
    const target = deployTarget(build, resources);
    return {
      name: NAME,
      entrypoint,
      compatibilityDate: "2026-10-06",
      compatibilityFlags: ["nodejs_compat"],
      assets: { notFoundHandling: "none" },
      domains: target.domains,
      workersDev: false,
      // Said outright: left unset, the account's default decides whether each version also gets a
      // public `<version>-yogan-hockey.<subdomain>.workers.dev` address. hockey.yogan.dev is the
      // site's only address.
      previewUrls: false,
      observability: {
        enabled: true,
        logs: { enabled: true, invocationLogs: true },
        traces: { enabled: true },
        issues: { enabled: true },
      },
      exports: {
        GameAgent: exports.durableObject({ storage: "sqlite" }),
        ScoreboardAgent: exports.durableObject({ storage: "sqlite" }),
        SkeletonAgent: exports.durableObject({ storage: "sqlite" }),
      },
      env: {
        ASSETS: bindings.assets(),
        // The disposable cache behind vinext's data cache (kvDataAdapter's default binding name).
        VINEXT_KV_CACHE: bindings.kv({ id: target.kvId }),
        // The permanent record.
        DB: bindings.d1({ id: target.d1Id, name: target.d1Name }),
        GameAgent: bindings.durableObject({ worker: NAME, exportName: "GameAgent" }),
        // Workers AI, which makes the Predictions. It has no local simulation: under `pnpm dev`
        // every call fails, and each scheduled game gets a failed row. `AI_REMOTE=1 pnpm dev`
        // sends the calls to the account cf is logged in to (vite.config.ts reads the same
        // switch). Left unset, not false: cf refuses an AI binding that says `remote: false`.
        AI: bindings.ai(process.env.AI_REMOTE === "1" ? { dev: { remote: true } } : undefined),
        ScoreboardAgent: bindings.durableObject({ worker: NAME, exportName: "ScoreboardAgent" }),
        SkeletonAgent: bindings.durableObject({ worker: NAME, exportName: "SkeletonAgent" }),
      },
    };
  }),
});
