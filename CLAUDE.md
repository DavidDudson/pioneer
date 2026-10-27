# Pioneer

Pathfinder 2e (remaster) character manager: Nx monorepo, Bun + Elysia + Drizzle/Postgres API, Angular web app.
Architecture, ADRs and the roadmap live in `docs/`; UI rules in `libs/frontier/AGENTS.md`; licensing in
`NOTICE.md`. Read the relevant ones before changing an area.

## Workflow

Project management is GitHub only: milestones M0-M12 and i18n, epics as issues, stories as sub-issues, board
"Pioneer" (`users/DavidDudson/projects/2`), dependency order through "blocked by" links.

- Every story is one full-stack vertical slice in one PR: migration, domain/engine, contract, API, Angular
  feature, `en` message keys, tests.
- Epics are split into story sub-issues before work starts and delivered as stacked PRs with `gh stack`, one
  story per layer.
- No literal user-facing text in templates or engine output (ADR-0009).
- Frontier knows no schemas. Components that render rules data are presentational ones in a `ui` library, with a
  story each, or containers in a `feature` library (ADR-0028).
- Commits and PR titles are Conventional Commits with subjects of at most 72 characters (squash merge;
  `committed.toml`). The user merges.

Repo skills in `.claude/skills`:

| Skill                | Use                                                                               |
| -------------------- | --------------------------------------------------------------------------------- |
| `work-issue`         | Board issue to reviewed PR: pick, branch, build, review, PR, feedback loop        |
| `stack`              | Epic to story sub-issues to stacked PRs (`gh stack`)                              |
| `review`             | Pre-PR persona review against repo rules and ADRs, findings verified              |
| `create-pr`          | Review, commit, push, before/after screenshots, open PR, request Copilot, wait    |
| `resolve-coderabbit` | Verify and fix or decline CodeRabbit and Copilot threads, reply in each           |
| `pickup`             | Continue an in-progress PR or ticket: rebase on main, conflicts, feedback, finish |
| `reimport`           | Re-run the Foundry content import and restore hand additions from HEAD            |

Helpers: `.claude/scripts/pr-threads.sh` (unresolved review threads as JSON),
`.claude/scripts/wait-for-review.sh` (block until Copilot, CodeRabbit or CI finish; run in the background) and
`.claude/scripts/pr-screenshots.sh` (upload PR screenshots to the `pr-screenshots` branch, print Markdown links).

PRs that change UI carry before/after screenshots. Pages behind auth: sign in locally through the dev bypass,
`/api/auth/dev/<dev user id>?returnTo=<path>` (`create-pr` step 4).

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
- User content (characters, campaigns, homebrew packs) is archived, never deleted: `archived_at`, `archive`/`restore`, no
  `.delete()` on its tables (`pioneer/no-archivable-delete`; ADR-0062). Say "archived", not "deleted".
- Project rules oxlint lacks go in `tools/oxlint/pioneer-plugin.ts` (TypeScript) or `tools/eslint/` (templates).

## Checks

**CI runs the full checks; locally run only small, cheap ones.** Verify with oxlint and oxfmt on the changed files, the
touched project's `typecheck`, and the specs next to the change (`bunx nx run <project>:test --include="**/<name>.spec.ts"`).
Never run `bun run affected`, `nx affected`, `bun run lint:workspace` or `bun run check` locally: the affected space
is often large and they use a lot of CPU. Run every lint, typecheck or test command through
`.claude/scripts/run-check.sh <command>`: it waits until the machine's load is under 70% of its cores and holds one
lock shared by all workspaces, so only one workspace runs checks at a time (the others queue). Check `uptime` first if
you are unsure how busy the machine is. `just db-up` for Postgres only when a db test you run needs it. CI runs
`bun run check` split across parallel jobs (the `ci:*` scripts); a new `check` target goes in one of them too.

### Formatters and linters

Run these in the devshell (`nix develop -c bash -c '<cmd>'`). Hooks (`just hooks`, `prek.toml`) run the file-level
ones on staged files; `bun run lint:workspace` runs the whole-repo ones (CI). **Never run Prettier**, with `bunx prettier`
or any other way: the formatter is `oxfmt`, and one Prettier pass rewrites unrelated files.

| Tool                                                   | Owns                                                   | Check                                                                   | Fix                                       |
| ------------------------------------------------------ | ------------------------------------------------------ | ----------------------------------------------------------------------- | ----------------------------------------- |
| oxfmt                                                  | Formatting: TS, HTML, JSON, MD, CSS                    | `bun run format:check`                                                  | `bun run format`, or `bunx oxfmt <files>` |
| oxlint                                                 | TypeScript lint, incl. `pioneer/*` rules               | `bunx nx run <project>:lint`                                            | `bunx oxlint --fix <files>`               |
| ESLint                                                 | Angular templates (`.html`)                            | `bunx nx run <project>:lint-templates`                                  | `bunx eslint --fix <files>`               |
| Biome                                                  | CSS lint only                                          | `bunx biome lint --error-on-warnings`                                   | `bunx biome lint --write <files>`         |
| taplo                                                  | TOML format and lint                                   | `taplo check && taplo fmt --check`                                      | `taplo fmt`                               |
| rumdl                                                  | Markdown lint                                          | `rumdl check .`                                                         | `rumdl check --fix .`                     |
| typos                                                  | Spelling                                               | `typos`                                                                 | `typos -w`                                |
| knip                                                   | Unused files, exports, dependencies                    | `bunx knip`                                                             | Delete the export, or the file            |
| hadolint, `tofu fmt`                                   | `Dockerfile`, `infra/`                                 | `hadolint Dockerfile`, `tofu fmt -check -recursive infra`               | `tofu fmt -recursive infra`               |
| `check:messages`, `check:components`, `check:contrast` | Message keys, component coverage, token contrast       | `bun run check:messages` (and the others)                               | Fix the keys, stories or tokens           |
| committed                                              | Conventional Commit subjects, 72 characters at most    | Runs in the `commit-msg` hook                                           | Reword the commit                         |
| tsc                                                    | Types                                                  | `bunx nx run <project>:typecheck`                                       | Fix the code                              |
| bun test, vitest                                       | Tests: `bun test` for libs and API, vitest for Angular | `bunx nx run <project>:test`; one spec: `--include="**/<name>.spec.ts"` | Fix the code                              |

| Scope                              | Command                                                        |
| ---------------------------------- | -------------------------------------------------------------- |
| Your change (run locally)          | oxlint/oxfmt on the files, one project's `typecheck` and specs |
| Projects CI says are affected      | `bun run affected` (CI only, not locally)                      |
| Repo-wide linters and format check | `bun run lint:workspace` (CI only, not locally)                |
| Everything CI runs                 | `bun run check` (CI only, not locally)                         |
