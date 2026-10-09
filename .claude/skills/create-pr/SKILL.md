---
name: create-pr
description: Create a Pioneer pull request the repo's way. Reviews first, commits with a conventional message, pushes, opens the PR linked to its issue, records it in the ws workspace, requests the first Copilot review and waits for Copilot and CodeRabbit. Use when the user says "create a PR", "open a PR", "ship it", "raise a PR", or when work-issue or pickup reaches the PR step.
argument-hint: '[issue-number] [--draft]'
---

# Create a PR

## 1. Preconditions

- On a feature branch, never `main`. Inside a ws workspace (`$WS_NAME` set or cwd under `~/workspaces/<ws>`),
  branches come only from `ws checkout <repo> <branch>`; never `git switch`/`git checkout <branch>`.
- Branch name: `<type>/<issue>-<slug>`, for example `feat/7-i18n-foundation`. Types match `committed.toml`.
- Find the issue: the argument, else the number in the branch name, else ask. Read it with `gh issue view <n>`.
  A PR closes stories, not epics: if the issue is an epic, close the story instead and mention the epic.

**Part of a stack?** If `gh stack view --json` shows the branch belongs to a stack (an epic's stories), do not
use `gh stack submit` to open PRs. Review as below, then follow the `stack` skill's submit step: open each
layer's PR with `gh pr create --base <layer below> --title "<conventional title>"` and the step 4 body
**before** `gh stack submit --auto`, which only links them. Its auto-generated titles fail CI's PR-title check,
and that check does not re-run when a title is edited. Then use steps 5 and 6 here to request Copilot and wait.

## 2. Review before anything leaves the machine

Run the `review` skill with fixes enabled. Do not continue while it reports unfixed blockers or majors, or while
`bun run affected` / `bun run lint:workspace` fail. Never commit secrets, `.env` files or build output.

## 3. Commit and push

- Conventional Commits, subject at most 72 characters, lowercase after the type, body explains why. The PR is
  squash-merged, so the PR title must also be conventional (CI checks it). CI checks it only when the PR is
  opened or gets new commits, never on an edit, so pass the final title at creation. If it is fixed later, `gh run rerun`
  does not help (it replays the old event's title): push a commit, or `gh pr close <pr> && gh pr reopen <pr>`.
- End commit messages with the attribution line given in the session's system reminder, if any.
- Push: `git push -u origin HEAD`. If GitHub refuses an HTTPS push that touches `.github/workflows` (the token
  lacks the `workflow` scope), push over SSH instead:
  `git push -u git@github.com:DavidDudson/pioneer.git HEAD:<branch>`, then
  `git branch -u origin/<branch>` after a fetch.

## 4. Open the PR

Ask before creating it unless the caller (work-issue, pickup) already has the user's go-ahead.

```sh
gh pr create --title "<conventional title>" --body-file - [--draft] <<'EOF'
## Summary

<what changed and why, 2-5 bullets>

Closes #<story>

## Full-stack slice

- [x] Migration / schema
- [x] Domain or engine logic
- [x] API contract and handler
- [x] Angular feature
- [x] `en` message keys
- [x] Tests

<untick or delete layers this story does not touch>

## Testing

<commands run and their results; what was not run and why>

## Review

<summary of the review skill: personas run, findings fixed, anything left PLAUSIBLE for a human>

<PR attribution line from the system reminder, if any>
EOF
```

`Closes #n` links the PR so the board moves the issue to In progress and to Done on merge.

Then, inside a ws workspace: `ws pr <repo>`.

## 5. Request the first Copilot review

Copilot does not review automatically. Request it once, right after creating the PR:

```sh
gh pr edit <pr> --add-reviewer "@copilot"
```

Re-request it (same command) only after substantial new commits, never in a loop.

## 6. Wait for reviewers

Start the waits with the Bash tool's `run_in_background`; you are notified when each exits.

```sh
.claude/scripts/wait-for-review.sh <pr> copilot      # Copilot's review on the head commit
.claude/scripts/wait-for-review.sh <pr> coderabbit   # CodeRabbit finished the head commit
.claude/scripts/wait-for-review.sh <pr> ci           # every check finished
```

Exit 0 is done, 1 is CI failed, 2 is timed out (default 30 minutes; say so and stop rather than polling more).

When the reviewers are done, hand over to the `resolve-coderabbit` skill, which handles Copilot's threads too.
Report the PR URL and the state of CI and reviews.
