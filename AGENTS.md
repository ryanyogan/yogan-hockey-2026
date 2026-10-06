The 2026 rebuild of Yogan Hockey: TypeScript on Cloudflare (a backend on the Agents SDK, a vinext UI), one pnpm monorepo. The Elixir app at `ryanyogan/yogan_hockey` (local clone: `../yogan_hockey`) is the parity reference.

## How work is done

One ticket at a time, each by the `implement` skill (`~/.claude/skills/implement/SKILL.md`): TDD at the agreed seams, typecheck and single test files as you go, the full suite once at the end, then `/code-review`, then commit.

- **One ticket per session.** The session Ryan talks to picks the frontier ticket, sees it through to a merged pull request on a branch named `issue-<n>-<slug>`, reports, and stops. Ryan clears the context before the next ticket, so everything the next session needs is on the issue, in the pull request or in the repo.
- **Main or subagents.** A simple ticket is done in the main session. A ticket with independent parts is split across parallel subagents, because parallel work finishes sooner; each subagent follows `implement` for its part and the main session verifies and integrates.
- **Context budget**: a subagent stays under 200k tokens of context. Approaching it, the subagent commits and pushes its work, posts a **handoff** comment on the issue, and ends its turn; the main session spawns a fresh subagent from that handoff.
- **Handoff comment**: what is done, what is left against the issue's "Done when", the branch, how to run and verify, and anything learned that the code does not show.
- **Done** for a ticket is every "Done when" line met, with the checks run and their output reported. Done for the project is every line of the parity checklist (#55) met or exceeded.
- **Pixel perfect**: any UI ticket is finished by comparing screenshots, in light and dark and at phone and desktop widths, against the Parity Reference (run from `../yogan_hockey` or at `yogan-hockey.fly.dev`) or against the variant the spec names where the design changed.

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
