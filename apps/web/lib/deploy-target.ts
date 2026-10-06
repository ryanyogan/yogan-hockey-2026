/** The ids of one KV namespace and one D1 database, or null until account setup records them. */
export type Stores = { kv: string | null; d1: string | null };

/** The shape of `cloudflare.resources.json`: the production pair and the pair previews share. */
export type Resources = { production: Stores; preview: Stores };

/**
 * The key of the simulated database in local dev, which `scripts/migrate-local.sh` repeats.
 * It is no database on Cloudflare.
 */
export const LOCAL_D1_ID = "00000000-0000-4000-8000-000000000031";

/**
 * Which stores and which hostname a build of the Worker gets.
 *
 * `cf previews deploy` gives a preview its own Durable Objects but binds KV and D1 exactly as the
 * config names them, so this choice is what keeps a preview from writing production data.
 */
export function deployTarget(
  build: { isPreview: boolean; mode: string | undefined },
  resources: Resources,
) {
  const stores = build.isPreview ? resources.preview : resources.production;
  return {
    kvId: stores.kv ?? undefined,
    d1Id: build.mode === "development" ? LOCAL_D1_ID : (stores.d1 ?? undefined),
    d1Name: build.isPreview ? "yogan-hockey-preview" : "yogan-hockey",
    // Production answers on the custom domain alone: workers.dev would be a way round Access.
    domains: build.isPreview ? [] : ["hockey.yogan.dev"],
  };
}
