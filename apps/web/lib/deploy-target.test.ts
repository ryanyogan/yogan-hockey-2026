import { expect, test } from "vitest";
import { deployTarget, LOCAL_D1_ID } from "./deploy-target.ts";

const resources = {
  production: { kv: "kv-production", d1: "d1-production" },
  preview: { kv: "kv-preview", d1: "d1-preview" },
};

test("a production deploy binds the production stores and the custom domain", () => {
  expect(deployTarget({ isPreview: false, mode: "production" }, resources)).toEqual({
    kvId: "kv-production",
    d1Id: "d1-production",
    d1Name: "yogan-hockey",
    domains: ["hockey.yogan.dev"],
  });
});

test("a preview binds the preview stores and takes no domain", () => {
  expect(deployTarget({ isPreview: true, mode: "production" }, resources)).toEqual({
    kvId: "kv-preview",
    d1Id: "d1-preview",
    d1Name: "yogan-hockey-preview",
    domains: [],
  });
});

test("a preview never falls back to a production store whose own id is missing", () => {
  const target = deployTarget(
    { isPreview: true, mode: undefined },
    { ...resources, preview: { kv: null, d1: null } },
  );

  expect(target.kvId).toBeUndefined();
  expect(target.d1Id).toBeUndefined();
});

test("local dev keys its simulated database by the id the local migrations use", () => {
  const target = deployTarget({ isPreview: false, mode: "development" }, resources);

  expect(target.d1Id).toBe(LOCAL_D1_ID);
});
