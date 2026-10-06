import { bindings, defineConfig, defineWorker, exports } from "cf/config";

// PROTOTYPE: one Worker holds both the vinext site and the GameAgent.
const NAME = "yogan-hockey-prototype-agent-game";

export default defineConfig({
  worker: defineWorker({
    name: NAME,
    entrypoint: "./worker.ts",
    compatibilityDate: "2026-10-05",
    compatibilityFlags: ["nodejs_compat"],
    assets: { notFoundHandling: "none" },
    observability: { enabled: true },
    exports: {
      GameAgent: exports.durableObject({ storage: "sqlite" }),
    },
    env: {
      ASSETS: bindings.assets(),
      GameAgent: bindings.durableObject({ worker: NAME, exportName: "GameAgent" }),
    },
  }),
});
