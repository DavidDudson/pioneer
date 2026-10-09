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
- Commits and PR titles are Conventional Commits with subjects of at most 72 characters (squash merge;
  `committed.toml`). The user merges.

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

## Code style

Lint is strict (`.oxlintrc.json`, every category an error) and is the source of truth; fix the code, never
relax a rule without a reason recorded beside it. Rules that trip agents most:

- Braces on every `if`/`else`/loop body, one-liners included (`eslint/curly`).
- Await into a named const, then branch on the name. `const fileExists = await file.exists(); if (!fileExists)`,
  never `if (!(await file.exists()))` (`pioneer/no-await-in-condition`, also covers loops and ternaries).
- Every function declares its return type, arrow consts included (`explicit-function-return-type`).
- Return types are named and short: an object shape gets an `interface`/`type` (`pioneer/no-inline-return-types`),
  and types are declared or imported, never derived with `ReturnType`/`Parameters`/`InstanceType`
  (`pioneer/no-derived-types`).
- No bare `string`/`number` in domain or rules code (`libs/*/domain`, `libs/rules/sdk`;
  `pioneer/no-primitive-domain-types`). Ids and quantities are Zod brands (`CharacterId`, `Feet`, `Level`,
  `Milliseconds`); closed sets are const objects (`Attribute`, `DamageType`, `ProblemType`). Build a brand with
  `Brand.parse(...)`, never `as`.
- A brand carries the unit, so names don't repeat it: `REVERT_WINDOW: Milliseconds`, `speed: Feet`.
  `const NAME = Brand.parse(5000)` is a named constant (`pioneer/no-magic-numbers`).
- Text is a message key in the `en` bundle (`src/i18n/en.json`), spelled out in full: never build a key at
  runtime (`'character.attribute.' + id`); map to full keys in a const object instead. Templates may not hold
  literal copy (`pioneer/no-literal-text`), and `bun run check:messages` fails on missing or unused keys.
- Project rules oxlint lacks go in `tools/oxlint/pioneer-plugin.ts` (TypeScript) or `tools/eslint/` (templates).

## Checks

`just db-up` for Postgres, then `bun run affected` and `bun run lint:workspace` before every PR; CI runs
`bun run check`.
