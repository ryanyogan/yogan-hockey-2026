import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";

// Applying is idempotent, so every test file starts on the migrated schema.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
