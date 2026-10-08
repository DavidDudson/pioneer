---
name: work-issue
description: Take a Pioneer issue from the project board to a reviewed PR in one loop - pick or read the issue, check it is unblocked, branch, build the full-stack slice, review, open the PR, wait for Copilot and CodeRabbit, and resolve their feedback until the PR is ready to merge. Use when the user says "work on #n", "pick up the next ticket", "do the next Ready issue", "build issue n", or "loop on this issue".
argument-hint: '[issue-number | next]'
---

# Work an issue end to end

Never merge; the user merges. Board moves happen through the project's built-in workflows (linked PR → In
progress, merged → Done), except that you move an epic to In progress when its first story starts.

## 1. Choose the issue

- Number given: use it.
- `next` or nothing: take the Ready item with the lowest **Order** on the board.

  ```sh
  gh project item-list 2 --owner DavidDudson --limit 200 --format json \
    | jq '[.items[] | select(.status == "Ready")] | sort_by(.order) | .[0]'
  ```

- Read it fully: `gh issue view <n> --comments`, its parent epic, its sub-issues, and the docs it links.
- **Blocked?** `gh api repos/{owner}/{repo}/issues/<n>/dependencies/blocked_by -q '[.[] | select(.state == "open") | .number]'`.
  If anything is open, stop and report the blockers.
- **Epic?** (`type:epic` label) An epic is never built as one PR. It is delivered as a **stack**: one story
  sub-issue per layer, one PR per layer. Hand over to the `stack` skill, which creates the story sub-issues if
  they are missing (standing policy, no approval needed) and builds the layers bottom-up. Steps 3 to 6 below then
  apply to each layer. A story that turns out too big for one PR is split the same way: sub-issues under it,
  built as a stack.

## 2. Branch

A story that is a layer of an epic's stack gets its branch from `gh stack add` (see the `stack` skill). A
standalone story:

Inside a ws workspace: `ws checkout pioneer <type>/<n>-<slug>`. If `ws checkout` refuses (claimed elsewhere), stop
and tell the user. Outside ws: `git fetch origin && git switch -c <type>/<n>-<slug> origin/main`.

If the issue belongs to an epic still in Backlog or Ready, move the epic to In progress on the board.

## 3. Plan

Write a short plan before coding: acceptance criteria from the issue, the layers this slice touches (migration,
domain/engine, contract, API, Angular feature, `en` message keys, tests), the ADRs and rules that apply, and
anything ambiguous. If a requirement is genuinely ambiguous, ask the user before building; otherwise state the
assumption in the plan and the PR.

## 4. Build the slice

- One full-stack vertical slice, matching surrounding code: Nx layering, zod codecs at boundaries, frontier
  components only, message keys instead of literal text, migrations generated with drizzle-kit.
- Tests alongside: property tests for engine and dice logic, `*.db.test.ts` for persistence, component specs.
- Commit in small conventional commits as you go.
- Keep running `bun run affected` while building; finish with it and `bun run lint:workspace` green
  (`just db-up` first when db tests are involved).
- Stay in scope. Note follow-ups for the PR description instead of building them.

## 5. Review and PR

1. `review` skill with fixes enabled. Loop until no unfixed blockers or majors.
2. `create-pr` skill with this issue number. It requests the first Copilot review and starts the waits. For a
   stack layer, `create-pr` defers to `gh stack submit` (see the `stack` skill).

## 6. Feedback loop

1. When CI and reviewers finish, run `resolve-coderabbit`.
2. If CI fails, read the failing job (`gh run view <id> --log-failed`), fix the cause, push, and wait again.
3. Repeat until: CI green, no threads awaiting a reply, no unfixed blockers. Cap at **five** feedback rounds in
   total; then stop and summarise what is left.

## 7. Hand over

Report: PR URL, what was built, checks and review status, anything declined or left for the user, and follow-up
issues worth creating. Ask before creating follow-ups.
