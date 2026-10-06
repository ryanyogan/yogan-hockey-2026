# Yogan Hockey 2026

The 2026 rebuild of [Yogan Hockey](https://github.com/ryanyogan/yogan_hockey): TypeScript on Cloudflare, with a backend on the Agents SDK and a vinext (shadcn + Tailwind) UI, in one pnpm monorepo.

The design is decided and the build is about to start. Nothing is built yet.

- **Spec:** [`docs/spec.md`](docs/spec.md) states the whole design, and ends with the assumptions nobody has run yet.
- **Why:** the larger choices are recorded in [`docs/adr/`](docs/adr), and the vocabulary in [`GLOSSARY.md`](GLOSSARY.md).
- **Build:** the work is broken into issues labelled [`ready-for-agent`](https://github.com/ryanyogan/yogan-hockey-2026/issues?q=is%3Aissue+is%3Aopen+label%3Aready-for-agent) and [`ready-for-human`](https://github.com/ryanyogan/yogan-hockey-2026/issues?q=is%3Aissue+is%3Aopen+label%3Aready-for-human), starting with [Walking skeleton: the joins nobody has run](https://github.com/ryanyogan/yogan-hockey-2026/issues/31).
- **Account setup:** [`scripts/account-setup.sh`](scripts/account-setup.sh) walks Ryan through the one-time Cloudflare and GitHub setup of [#32](https://github.com/ryanyogan/yogan-hockey-2026/issues/32). It is safe to rerun, and is rerun once after the first deploy.
- **How it was decided:** the closed [map](https://github.com/ryanyogan/yogan-hockey-2026/issues/1) indexes every decision and the ticket that holds its detail.

The Elixir app in `ryanyogan/yogan_hockey` is the parity reference.

## Run it

`mise install` gives the pinned Node and pnpm. Then:

```
pnpm install
pnpm dev          # http://localhost:5173, with KV, D1 and the Agents simulated locally
```

Checks, all from the root: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` (run `pnpm exec playwright install chromium` once first) and `pnpm build`.

After changing `packages/db/src/schema.ts`, `pnpm db:generate` writes the migration; `pnpm dev` applies it.
