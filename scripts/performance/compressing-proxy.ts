// Stands in front of a local build and compresses what it answers, as Cloudflare does in
// production. `vite preview` sends every byte uncompressed: 790 kB of script where the deployed
// site sends about 250, which on a throttled network is seconds that no visitor waits.
//
//   node scripts/performance/compressing-proxy.ts <listen-port> <target-port>
//
// gzip at level 6, flushed with every chunk so a streamed document still streams. Production
// sends Brotli, which is a little smaller, so a time measured through this errs on the slow side.
// The Agents' sockets are passed through untouched.
import { createServer, request } from "node:http";
import { connect } from "node:net";
import { constants, createGzip } from "node:zlib";

const [listen, target] = process.argv.slice(2).map(Number);
if (!listen || !target) {
  console.error("usage: compressing-proxy.ts <listen-port> <target-port>");
  process.exit(1);
}

const COMPRESSIBLE = /^(text\/|application\/(javascript|json|xml)|image\/svg)/;

const server = createServer((incoming, outgoing) => {
  const upstream = request(
    {
      host: "localhost",
      port: target,
      method: incoming.method,
      path: incoming.url,
      headers: incoming.headers,
    },
    (answer) => {
      const type = String(answer.headers["content-type"] ?? "");
      const compress =
        COMPRESSIBLE.test(type) &&
        answer.headers["content-encoding"] == null &&
        String(incoming.headers["accept-encoding"] ?? "").includes("gzip") &&
        incoming.method !== "HEAD" &&
        ![204, 304].includes(answer.statusCode ?? 200);
      if (!compress) {
        outgoing.writeHead(answer.statusCode ?? 502, answer.headers);
        answer.pipe(outgoing);
        return;
      }
      const { "content-length": _length, ...headers } = answer.headers;
      outgoing.writeHead(answer.statusCode ?? 502, { ...headers, "content-encoding": "gzip" });
      const gzip = createGzip({ level: 6, flush: constants.Z_SYNC_FLUSH });
      answer.pipe(gzip).pipe(outgoing);
    },
  );
  upstream.on("error", () => {
    if (!outgoing.headersSent) outgoing.writeHead(502);
    outgoing.end();
  });
  incoming.pipe(upstream);
});

// A WebSocket: replay the request to the build and join the two sockets.
server.on("upgrade", (incoming, socket, head) => {
  const upstream = connect(target, "localhost", () => {
    const headers = Object.entries(incoming.headers).map(([name, value]) => `${name}: ${value}`);
    upstream.write(
      `${incoming.method} ${incoming.url} HTTP/1.1\r\n${headers.join("\r\n")}\r\n\r\n`,
    );
    upstream.write(head);
    socket.pipe(upstream);
    upstream.pipe(socket);
  });
  const close = () => {
    socket.destroy();
    upstream.destroy();
  };
  upstream.on("error", close);
  socket.on("error", close);
});

server.listen(listen, () => {
  console.error(`compressing http://localhost:${target} at http://localhost:${listen}`);
});
