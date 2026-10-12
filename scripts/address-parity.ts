// Asks two sites for every address of scripts/addresses.ts and says where they answer
// differently: the status, `location` and `<title>` of each, redirects not followed.
//
//   node scripts/address-parity.ts <main's site> <the branch's site> [--out=<file.md>]
//
// Both in fixture mode (ESPN_FIXTURES=1), as builds or under `pnpm dev`: the ids are the
// recorded ones. It exits 1 when a status or a `location` differs at an address that is not
// marked as meant to (`intended` in scripts/addresses.ts). A difference in title, media type or
// `allow` is printed and does not fail. It reads, and sends POST, PUT, PATCH and DELETE with no
// body only to `/picks`, `/nhl` and `/nhl/`, which refuse them, ignore them or redirect them.
import { writeFileSync } from "node:fs";
import {
  type Address,
  type Answer,
  addresses,
  compare,
  fails,
  ownPath,
  parityReport,
  titleOf,
} from "./addresses.ts";

const args = process.argv.slice(2);
const [main, branch] = args
  .filter((arg) => !arg.startsWith("--"))
  .map((base) => base.replace(/\/$/, ""));
const out = args.find((arg) => arg.startsWith("--out="))?.slice(6);
if (!main || !branch) {
  console.error("usage: address-parity.ts <main's site> <the branch's site> [--out=<file.md>]");
  process.exit(1);
}

async function ask(base: string, address: Address): Promise<Answer> {
  const answer = await fetch(base + address.path, {
    method: address.method ?? "GET",
    redirect: "manual",
    headers: { accept: "text/html,*/*" },
  });
  const type = answer.headers.get("content-type")?.split(";")[0]?.trim() ?? null;
  // The body is read whatever it is, so the connection is free for the next address.
  const body = await answer.text();
  return {
    status: answer.status,
    location: ownPath(answer.headers.get("location"), base),
    title: type === "text/html" ? titleOf(body) : null,
    type,
    allow: answer.headers.get("allow"),
  };
}

const all = [];
for (const address of addresses()) {
  // One site at a time, one address at a time: neither is asked to render two pages at once.
  all.push(compare(address, await ask(main, address), await ask(branch, address)));
}
const text = parityReport(all, { main, branch });
if (out) writeFileSync(out, text);
console.log(text);
process.exit(fails(all) ? 1 : 0);
