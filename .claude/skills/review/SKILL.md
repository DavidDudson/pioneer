---
name: review
description: Pioneer's pre-PR code review. Runs persona reviewers in parallel against the branch diff, each checking the repo's rules and ADRs, then verifies every finding against the code before reporting or fixing. Use before creating a PR, when the user says "review this", "review my changes", "check this before PR", or when the create-pr, work-issue or pickup skills reach their review step.
argument-hint: '[base-ref] [--fix]'
---

# Pioneer review

Review the current branch against `origin/main` (or the given base) before it becomes a PR. The goal is findings
that are **true**: every one is checked against the code and the repo's written rules before it is reported.

## 1. Gather context

```sh
git fetch origin
base="${1:-origin/main}"
git diff --stat "$base"...HEAD
git diff "$base"...HEAD
git log --oneline "$base"..HEAD
```

Also read, so personas can cite them:

- The linked issue and its parent epic (`gh issue view <n>`), if the branch name or commits reference one.
- `docs/architecture/*.md`, `docs/adr/*.md`, `docs/roadmap.md` (ticket rules), `libs/frontier/AGENTS.md`,
  `NOTICE.md`.
- Lint configs that encode rules: `.oxlintrc.json`, `tools/oxlint/pioneer-plugin.ts`, `eslint.config.ts`,
  `tools/eslint/`, `knip.json`, `bunfig.toml`.

If the diff is empty, say so and stop.

## 2. Run the personas

Launch one Agent per persona **in a single message** so they run in parallel. Give each: the diff (or the list of
changed files and the base ref so it can run `git diff` itself), the issue text, its persona brief below, and the
output contract. Personas only read; they never edit.

| Persona                                  | Checks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Rules engine and PF2e accuracy**       | Engine stays pure (no I/O, clock, randomness) and depends only on `shared/kernel` and `rules/sdk`. PF2e maths is right: typed bonus/penalty stacking, proficiency, degrees of success, MAP, dex caps. Rule elements follow Foundry semantics with typed schemas (ADR-0008). Predicates use three-valued logic (ADR-0002). Every breakdown line and grant carries an origin. Every content entry has a valid source (ADR-0005). Numbers quoted from the rules are checked against the cited source, not memory; if no source is available, flag as unverified rather than wrong. |
| **Architecture and ADRs**                | Layering: domain has no framework imports; `rules/*` never imports feature areas; content is data, not code (ADR-0003); characters store inputs, never derived values (ADR-0004); overrides are effects with an origin. The change is one full-stack slice (roadmap ticket rules) and matches the issue's scope; nothing half-built or out of scope. New decisions with real alternatives have an ADR.                                                                                                                                                                          |
| **Frontend and frontier**                | Every rule in `libs/frontier/AGENTS.md`: no styling outside frontier, tokens only, no toasts or modals, no full page loads or resolvers, skeletons shaped like content, container queries only in layout primitives, 44px touch targets, 16px inputs, inline edit semantics. i18n (ADR-0009): no literal user-facing text in templates or engine output, message keys added to the `en` locale, lazy scopes respected. Accessibility: labels, focus, keyboard.                                                                                                                  |
| **Data, API and persistence**            | Zod at every trust boundary; codecs used for wire shapes. Migrations are generated, reversible in intent, and new user-data tables call `audit.enable`. Optimistic concurrency with `expectedVersion` and 409 on conflict. List sorts are index-backed. Ownership and authorisation checks in application services (ADR-0007). Campaign events append-only (ADR-0006).                                                                                                                                                                                                          |
| **Tests and quality**                    | Tests cover the acceptance criteria and the edge cases the change introduces: property tests for engine and dice logic, `*.db.test.ts` for persistence, component specs for UI. Tests assert behaviour (message keys, not English strings). No dead code or unused exports (knip), no commented-out code, naming and comment density match surrounding code.                                                                                                                                                                                                                    |
| **Security, licensing and supply chain** | No secrets or tokens. New dependencies are pinned exactly, justified, and respect `bunfig.toml` policy. No `bypassSecurityTrust*`, no `innerHTML` with content text. Content licensing per `NOTICE.md`: ORC text only with attribution, no Paizo art or trade dress, nothing Paizo behind sign-in.                                                                                                                                                                                                                                                                              |

Skip a persona only when the diff cannot touch its area (for example, a docs-only change skips Data and API), and
say which were skipped.

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

Combine the personas' findings, drop duplicates, then verify each one yourself (or with one verifier Agent for a
large set): open the file at the line, read enough surrounding code, and confirm both the evidence and the rule.
Discard anything that does not hold up. Tag survivors `CONFIRMED`; tag ones that are likely but need a human
judgement call `PLAUSIBLE`.

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
