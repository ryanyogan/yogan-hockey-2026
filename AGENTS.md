The 2026 rebuild of Yogan Hockey: TypeScript on Cloudflare (a backend on the Agents SDK, a TanStack Start UI rendered on the server with no server components: ADR 0009), one pnpm monorepo. The Elixir app at `ryanyogan/yogan_hockey` (local clone: `../yogan_hockey`) is the parity reference.

## How work is done

One ticket at a time, each by the `implement` skill (`~/.claude/skills/implement/SKILL.md`): TDD at the agreed seams, typecheck and single test files as you go, the full suite once at the end, then `/code-review`, then commit.

- **Orchestrator.** The session Ryan talks to orchestrates until the project is done: it takes every unblocked ticket off the frontier, gives each its own subagent in its own git worktree on a branch named `issue-<n>-<slug>`, verifies what comes back, merges the pull request, closes the ticket and moves to the tickets that unblocked. Unblocked tickets run in parallel. The orchestrator builds nothing itself, which keeps its own context for orchestration.
- **Decisions.** An open question gets the recommended answer and a line in the pull request saying so. One that is truly hard is recorded on issue #55 as a comment and left for Ryan at the end; work continues around it.
- **Slow checks are spent carefully.** CI and Playwright are the slow part: one Playwright smoke test per route in fixture mode and no more, behaviour proved in Vitest instead, CI jobs in parallel with the pnpm store and Playwright browsers cached. A subagent runs single test files while working and the full suite once before its pull request.
- **Context budget**: a subagent stays under 200k tokens of context. Approaching it, the subagent commits and pushes its work, posts a **handoff** comment on the issue, and ends its turn; the orchestrator spawns a fresh subagent from that handoff.
- **Handoff comment**: what is done, what is left against the issue's "Done when", the branch, how to run and verify, and anything learned that the code does not show.
- **Done** for a ticket is every "Done when" line met, with the checks run and their output reported. Done for the project is every line of the parity checklist (#55) met or exceeded.
- **Pixel perfect**: the visual target is the **Agate prototype** in `prototypes/agate` (`pnpm prototype:agate`), which Ryan approved on Oct 11 2026; it replaces the tuned ledger. `docs/design/agate.md` describes it and `docs/design/agate/` holds its screenshots. Finish any UI ticket by comparing screenshots against it, in light and dark and at phone and desktop widths (`node scripts/agate-home-compare.mjs` for Home, `node scripts/agate-routes.mjs` and `node scripts/agate-game-shots.ts` for the other routes). Pages the prototype doesn't draw extend its tokens, type and rules as `docs/design/agate.md` § "Other pages" says. The sentences the site prints follow `prototypes/agate/copy.js`. The Parity Reference is still the target for features and behaviour only.

- **Build notes**: `docs/agents/build-notes.md` holds what earlier tickets learned the hard way. Read it before building; add to it in your pull request.

## Preferences

- Prefer an established npm package over hand-rolling.
- In the TanStack Start app (`apps/web/src`), a page is a route whose loader waits for everything the page draws. A loader calls server functions and nothing else, one for each page-level read, each validating its input with the schemas in `packages/schemas`. Nothing is deferred, no route has a placeholder, and there is no TanStack Query (ADR 0009).
- While the branch `tanstack-start` exists (it is merged to `main` at the cutover, #193, and then deleted), pull requests for the port are based on it, never on `main`.

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues for `ryanyogan/yogan-hockey-2026` (via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
