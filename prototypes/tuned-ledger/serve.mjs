// PROTOTYPE (#128). Serves this folder to the local network, so it opens on a phone:
//   pnpm prototype:look            (port 5128, or PORT=<n>)
// Node only: no install, no build and nothing from the app.
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url)).replace(/[\\/]$/, "");
const port = Number(process.env.PORT ?? 5128);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

const server = createServer(async (request, response) => {
  let file;
  try {
    const { pathname } = new URL(request.url ?? "/", "http://localhost");
    file = normalize(join(root, decodeURIComponent(pathname === "/" ? "/index.html" : pathname)));
  } catch {
    // An address that cannot be read must not stop the server in the middle of a review.
    response.writeHead(400, { "content-type": "text/plain" }).end("Bad request");
    return;
  }
  const found = file.startsWith(root + sep) ? await stat(file).catch(() => null) : null;
  if (found == null || !found.isFile()) {
    response.writeHead(404, { "content-type": "text/plain" }).end("Not found");
    return;
  }
  response.writeHead(200, {
    "content-type": TYPES[extname(file)] ?? "application/octet-stream",
    // Always the file on disk: a phone must never show a stale copy during a review.
    "cache-control": "no-store",
  });
  createReadStream(file).pipe(response);
});

server.listen(port, "0.0.0.0", () => {
  const lan = Object.values(networkInterfaces())
    .flat()
    .filter((address) => address?.family === "IPv4" && !address.internal)
    .map((address) => `http://${address.address}:${port}`);
  console.log("Tuned ledger prototype (#128)\n");
  console.log(`  This computer   http://localhost:${port}`);
  for (const url of lan) console.log(`  Phone, same Wi-Fi  ${url}`);
  if (lan.length === 0)
    console.log("  No network address found: connect to Wi-Fi to open it on a phone.");
  console.log("\nCtrl+C stops it.");
});
