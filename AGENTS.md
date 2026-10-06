The 2026 rebuild of Yogan Hockey: TypeScript on Cloudflare (a backend on the Agents SDK, a vinext UI), one pnpm monorepo. The Elixir app at `ryanyogan/yogan_hockey` (local clone: `../yogan_hockey`) is the parity reference.

## Preferences

- Prefer an established npm package over hand-rolling.
- In the vinext app, use server components and Server Actions wherever they apply.

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues for `ryanyogan/yogan-hockey-2026` (via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
