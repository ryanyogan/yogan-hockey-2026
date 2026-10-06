The 2026 rebuild of Yogan Hockey: TypeScript on Cloudflare (a backend on the Agents SDK, a vinext UI), one pnpm monorepo. The Elixir app at `ryanyogan/yogan_hockey` (local clone: `../yogan_hockey`) is the parity reference.

## How work is done

The session Ryan talks to is the **orchestrator**: it picks the frontier issue, briefs a subagent, verifies what comes back, and merges. All building happens in subagents, one issue per subagent, on a branch named `issue-<n>-<slug>` with a pull request.

- **Context budget**: a subagent stays under 200k tokens of context. Approaching it, the subagent commits and pushes its work, posts a **handoff** comment on the issue, and ends its turn; the orchestrator spawns a fresh subagent from that handoff.
- **Handoff comment**: what is done, what is left against the issue's "Done when", the branch, how to run and verify, and anything learned that the code does not show.
- **Done** for an issue is every "Done when" line met, with the checks run and their output reported. Done for the project is every line of the parity checklist (#55) met or exceeded.
- **Pixel perfect**: any UI issue is finished by comparing screenshots, in light and dark and at phone and desktop widths, against the Parity Reference (run from `../yogan_hockey` or at `yogan-hockey.fly.dev`) or against the variant the spec names where the design changed.

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
