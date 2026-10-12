// Prints a wrangler configuration that holds the preview D1 database alone, for
// `wrangler d1 migrations apply DB --remote --config <file>` (.github/workflows/preview.yml).
// The database is the one under `previews` in apps/web/wrangler.jsonc.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse } from "jsonc-parser";

const config = parse(
  readFileSync(new URL("../apps/web/wrangler.jsonc", import.meta.url), "utf8"),
);
const database = config.previews.d1_databases.find((each) => each.binding === "DB");
if (!database?.database_id) throw new Error("wrangler.jsonc has no preview database bound as DB");

console.log(
  JSON.stringify({
    name: config.name,
    d1_databases: [
      {
        ...database,
        migrations_dir: fileURLToPath(new URL("../packages/db/migrations", import.meta.url)),
      },
    ],
  }),
);
