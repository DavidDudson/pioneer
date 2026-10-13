---
name: review
description: Pioneer's pre-PR code review. Runs only the persona reviewers the diff needs, each a clean-context Sonnet agent, each checking the repo's rules and ADRs, then verifies every finding against the code before reporting or fixing. Use before creating a PR, when the user says "review this", "review my changes", "check this before PR", or when the create-pr, work-issue or pickup skills reach their review step.
argument-hint: '[base-ref] [--fix]'
---

# Pioneer review

Review the current branch against `origin/main` (or the given base) before it becomes a PR. The goal is findings
that are **true**: every one is checked against the code and the repo's written rules before it is reported.

## 1. Gather context (cheap)

```sh
git fetch origin
base="${1:-origin/main}"
git diff --stat "$base"...HEAD
git log --oneline "$base"..HEAD
```

Read only the stat and the log here, plus the linked issue (`gh issue view <n>`) if the branch name or commits
reference one. Do **not** read the full diff, the docs or the ADRs in this session: each persona reads what it
needs in its own context, so loading them here pays for them twice.

If the diff is empty, say so and stop.

## 2. Run the personas

### Clean context, Sonnet

Every persona runs in a **clean context**: a fresh `general-purpose` Agent with `model: "sonnet"`. Never use
`subagent_type: "fork"`, and never put conversation history, earlier findings or your own view of the change in
the prompt; the persona sees the code cold, as a reviewer would. Personas only read; they never edit.

Prompt each with only: the base ref, the changed files in its area (from the stat), the issue number and its
acceptance criteria, its brief, its reading list, and the output contract. It runs
`git diff "$base"...HEAD -- <its files>` itself.

### Pick the fewest personas

Select personas from the changed paths:

| Persona                                  | Runs when the diff touches                                                                              | Reads (only these)                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Rules engine and PF2e accuracy**       | `libs/rules/**`, `content/**`, `libs/interop/**`, `tools/content-import/**`                             | ADRs cited by the changed code or issue; the rules sources the change quotes          |
| **Architecture and ADRs**                | More than one lib, a new lib or project, `docs/adr/**`, or a new import between libs                    | `docs/roadmap.md` ticket rules; `ls docs/adr`, then only the ADRs that match the area |
| **Frontend and frontier**                | `apps/web/**`, `libs/*/feature/**`, `libs/*/ui/**`, `libs/frontier/**`, `*.html`, `en.json`             | `libs/frontier/AGENTS.md`; ADR-0009; ADR-0028                                         |
| **Data, API and persistence**            | `apps/api/**`, `libs/*/application/**`, `libs/*/infrastructure/**`, `libs/*/data-access/**`, migrations | ADR-0004; ADR-0006; ADR-0007                                                          |
| **Tests and quality**                    | Any code change                                                                                         | Neighbouring tests of the changed files                                               |
| **Security, licensing and supply chain** | `package.json`, `bun.lock`, `bunfig.toml`, auth code, content text, `NOTICE.md`, assets                 | `NOTICE.md`; `bunfig.toml`                                                            |

Lint configs (`.oxlintrc.json`, `tools/oxlint/`, `tools/eslint/`, `knip.json`) are not reading material: the
mechanical checks in step 3 enforce them, so personas skip anything lint already catches.

Cost limits:

- **Small diff** (under ~300 changed lines, or a single area): launch **one** clean-context Sonnet Agent that
  carries the briefs of every selected persona.
- **Larger diff**: one Agent per selected persona, all **in a single message** so they run in parallel.
- **Docs- or config-only diff**: no personas; run the mechanical checks and read the diff inline.
- Say which personas ran and which were skipped.

Persona briefs:

| Persona                                  | Checks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Rules engine and PF2e accuracy**       | Engine stays pure (no I/O, clock, randomness) and depends only on `shared/kernel` and `rules/sdk`. PF2e maths is right: typed bonus/penalty stacking, proficiency, degrees of success, MAP, dex caps. Rule elements follow Foundry semantics with typed schemas (ADR-0008). Predicates use three-valued logic (ADR-0002). Every breakdown line and grant carries an origin. Every content entry has a valid source (ADR-0005). Numbers quoted from the rules are checked against the cited source, not memory; if no source is available, flag as unverified rather than wrong. |
| **Architecture and ADRs**                | Layering: domain has no framework imports; `rules/*` never imports feature areas; content is data, not code (ADR-0003); characters store inputs, never derived values (ADR-0004); overrides are effects with an origin. The change is one full-stack slice (roadmap ticket rules) and matches the issue's scope; nothing half-built or out of scope. New decisions with real alternatives have an ADR.                                                                                                                                                                          |
| **Frontend and frontier**                | Every rule in `libs/frontier/AGENTS.md`: no styling outside frontier, tokens only, no toasts or modals, no full page loads or resolvers, skeletons shaped like content, container queries only in layout primitives, 44px touch targets, 16px inputs, inline edit semantics. i18n (ADR-0009): no literal user-facing text in templates or engine output, message keys added to the `en` locale, lazy scopes respected. Accessibility: labels, focus, keyboard.                                                                                                                  |
| **Data, API and persistence**            | Zod at every trust boundary; codecs used for wire shapes. Migrations are generated, reversible in intent, and new user-data tables call `audit.enable`. Optimistic concurrency with `expectedVersion` and 409 on conflict. List sorts are index-backed. Ownership and authorisation checks in application services (ADR-0007). Campaign events append-only (ADR-0006).                                                                                                                                                                                                          |
| **Tests and quality**                    | Tests cover the acceptance criteria and the edge cases the change introduces: property tests for engine and dice logic, `*.db.test.ts` for persistence, component specs for UI. Tests assert behaviour (message keys, not English strings). No dead code or unused exports (knip), no commented-out code, naming and comment density match surrounding code.                                                                                                                                                                                                                    |
| **Security, licensing and supply chain** | No secrets or tokens. New dependencies are pinned exactly, justified, and respect `bunfig.toml` policy. No `bypassSecurityTrust*`, no `innerHTML` with content text. Content licensing per `NOTICE.md`: ORC text only with attribution, no Paizo art or trade dress, nothing Paizo behind sign-in.                                                                                                                                                                                                                                                                              |

### Output contract for every persona

Return a JSON array, empty if nothing is wrong. Each finding:

```json
{
  "persona": "Architecture and ADRs",
  "severity": "blocker | major | minor | nit",
  "file": "libs/rules/engine/src/stack.ts",
  "line": 42,
  "rule": "ADR-0004 / libs/frontier/AGENTS.md#... / roadmap ticket rules",
  "problem": "One sentence: what is wrong.",
  "evidence": "Quoted code and the quoted rule text that it breaks.",
  "fix": "Smallest change that fixes it."
}
```

Rules for personas: cite a written rule or a concrete failure scenario for every finding; no style preferences
that no rule states; no findings about code the diff did not change unless the change breaks it; prefer three
true findings over ten speculative ones.

## 3. Verify

Combine the personas' findings, drop duplicates, then verify each one yourself in this session (no verifier
Agent; only the files a finding names): open the file at the line, read enough surrounding code, and confirm both
the evidence and the rule. Discard anything that does not hold up. Tag survivors `CONFIRMED`; tag ones that are
likely but need a human judgement call `PLAUSIBLE`.

Then run the mechanical checks, which outrank opinions:

```sh
just db-up            # db tests need Postgres
bun run affected      # lint, lint-templates, typecheck, test, build, verify-styles for touched projects
bun run lint:workspace
```

Failures here are blockers.

## 4. Report or fix

Report findings grouped by severity with `file:line`, the rule, and the fix. Then:

- With `--fix`, or when called from create-pr, work-issue or pickup: fix every `CONFIRMED` blocker and major,
  rerun the mechanical checks, and commit with a conventional message (`fix: …` or `refactor: …` scoped to the
  area). Leave minors and nits for the user unless they are one-line and obviously right. List `PLAUSIBLE`
  items for the user; do not fix them silently.
- Otherwise, stop after the report and ask which to fix.

The review passes when there are no unfixed blockers or majors and the mechanical checks are green.
