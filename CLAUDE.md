# Pioneer

Pathfinder 2e (remaster) character manager: Nx monorepo, Bun + Elysia + Drizzle/Postgres API, Angular web app.
Architecture, ADRs and the roadmap live in `docs/`; UI rules in `libs/frontier/AGENTS.md`; licensing in
`NOTICE.md`. Read the relevant ones before changing an area.

## Workflow

Project management is GitHub only: milestones M0-M9, epics as issues, stories as sub-issues, board
"Pioneer" (`users/DavidDudson/projects/2`), dependency order through "blocked by" links.

- Every story is one full-stack vertical slice in one PR: migration, domain/engine, contract, API, Angular
  feature, `en` message keys, tests.
- Epics are split into story sub-issues before work starts and delivered as stacked PRs with `gh stack`, one
  story per layer.
- No literal user-facing text in templates or engine output (ADR-0009).
- Commits and PR titles are Conventional Commits (squash merge). The user merges.

Repo skills in `.claude/skills`:

| Skill                | Use                                                                               |
| -------------------- | --------------------------------------------------------------------------------- |
| `work-issue`         | Board issue to reviewed PR: pick, branch, build, review, PR, feedback loop        |
| `stack`              | Epic to story sub-issues to stacked PRs (`gh stack`)                              |
| `review`             | Pre-PR persona review against repo rules and ADRs, findings verified              |
| `create-pr`          | Review, commit, push, open PR, request Copilot, wait for reviewers                |
| `resolve-coderabbit` | Verify and fix or decline CodeRabbit and Copilot threads, reply in each           |
| `pickup`             | Continue an in-progress PR or ticket: rebase on main, conflicts, feedback, finish |

Helpers: `.claude/scripts/pr-threads.sh` (unresolved review threads as JSON) and
`.claude/scripts/wait-for-review.sh` (block until Copilot, CodeRabbit or CI finish; run in the background).

## Checks

`just db-up` for Postgres, then `bun run affected` and `bun run lint:workspace` before every PR; CI runs
`bun run check`.
