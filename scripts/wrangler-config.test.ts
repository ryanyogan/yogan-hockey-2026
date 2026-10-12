import { readFileSync } from "node:fs";
import { parse } from "jsonc-parser";
import { expect, test } from "vitest";

/**
 * What must stay true of `apps/web/wrangler.jsonc`, the Worker's only configuration: the things
 * a wrong edit would not show until a deploy, when they would cost stored data.
 */
type Binding = { binding: string };
type Config = {
  name: string;
  workers_dev: boolean;
  preview_urls: boolean;
  routes: unknown[];
  migrations?: unknown;
  exports: Record<string, { type: string; storage?: string; state?: string }>;
  durable_objects: { bindings: { name: string; class_name: string; script_name?: string }[] };
  kv_namespaces: (Binding & { id: string })[];
  d1_databases: (Binding & { database_id: string; database_name: string })[];
  ai: Binding;
  previews: Pick<Config, "durable_objects" | "kv_namespaces" | "d1_databases" | "ai">;
};

const source = readFileSync(new URL("../apps/web/wrangler.jsonc", import.meta.url), "utf8");
const config: Config = parse(source);
const agentsIndex = readFileSync(new URL("../apps/web/agents/index.ts", import.meta.url), "utf8");

const names = (bindings: Binding[]) => bindings.map((each) => each.binding).sort();
const agents = (bindings: Config["durable_objects"]["bindings"]) =>
  bindings.map((each) => each.class_name).sort();

test("the Agent classes are declared as exports, the way production holds them, and never as migrations", () => {
  expect(config.migrations).toBeUndefined();
  expect(config.exports).toEqual({
    GameAgent: { type: "durable-object", storage: "sqlite" },
    ScoreboardAgent: { type: "durable-object", storage: "sqlite" },
    SkeletonAgent: { type: "durable-object", storage: "sqlite" },
  });
});

test("every declared Agent class is exported by the Worker and bound under its own name", () => {
  const exported = [...agentsIndex.matchAll(/export \{ (\w+) \}/g)].map((found) => found[1]).sort();
  expect(Object.keys(config.exports).sort()).toEqual(exported);
  expect(agents(config.durable_objects.bindings)).toEqual(exported);
  for (const binding of config.durable_objects.bindings) {
    expect(binding.name).toBe(binding.class_name);
  }
});

test("the Worker keeps its name and answers on hockey.yogan.dev alone", () => {
  expect(config.name).toBe("yogan-hockey");
  expect(config.routes).toEqual([{ pattern: "hockey.yogan.dev", custom_domain: true }]);
  expect(config.workers_dev).toBe(false);
  expect(config.preview_urls).toBe(false);
});

test("a preview gets every binding production has, on stores that are not production's", () => {
  const { previews } = config;
  expect(names(previews.kv_namespaces)).toEqual(names(config.kv_namespaces));
  expect(names(previews.d1_databases)).toEqual(names(config.d1_databases));
  expect(previews.ai).toEqual(config.ai);
  expect(agents(previews.durable_objects.bindings)).toEqual(
    agents(config.durable_objects.bindings),
  );

  const production = [
    ...config.kv_namespaces.map((each) => each.id),
    ...config.d1_databases.flatMap((each) => [each.database_id, each.database_name]),
  ];
  const preview = [
    ...previews.kv_namespaces.map((each) => each.id),
    ...previews.d1_databases.flatMap((each) => [each.database_id, each.database_name]),
  ];
  expect(preview.every((id) => typeof id === "string" && id.length > 0)).toBe(true);
  expect(preview.filter((id) => production.includes(id))).toEqual([]);
});

test("a preview's Agent bindings name no other Worker, so they are never production's Agents", () => {
  for (const binding of config.previews.durable_objects.bindings) {
    expect(binding.script_name).toBeUndefined();
  }
});
