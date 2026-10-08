---
name: pickup
description: Continue in-progress Pioneer work - an open PR or an In progress / In review ticket. Checks it out, rebases onto the latest main, resolves conflicts, reruns checks, works through CodeRabbit and Copilot feedback, and carries on with the work-issue loop until the PR is ready to merge. Use when the user says "pickup", "pick up #n", "continue this PR", "carry on with the ticket", or "what was I doing".
argument-hint: '[pr-number | issue-number]'
---

# Pick up in-progress work

## 1. Find the work

- **Argument given:** a PR number, or an issue number (find its PR with
  `gh pr list --search "<n> in:body" --state open --json number,title,headRefName`).
- **No argument:** gather candidates and choose.

  ```sh
  ws status                                                   # branches/PRs this workspace already claims
  gh pr list --author "@me" --state open --json number,title,headRefName,isDraft,updatedAt
  gh project item-list 2 --owner DavidDudson --limit 200 --format json \
    | jq '[.items[] | select(.status == "In progress" or .status == "In review")]'
  ```

  Prefer this workspace's claim, then the most recently updated open PR. If several are equally likely, ask with
  the candidates listed. An In progress issue with no PR means the work was never pushed: check for a local branch
  first, otherwise start it with the `work-issue` skill.

## 2. Check out

Inside a ws workspace: `ws checkout pioneer #<pr>`. If it refuses because another workspace claims it, stop and
tell the user. Outside ws: `gh pr checkout <pr>`.

Read the PR (`gh pr view <pr> --comments`), its linked issue and epic, and `git log origin/main..HEAD` to rebuild
context: what was planned, what is done, what is left.

## 3. Update to latest main

**Stack?** If the PR is a layer of a stack (`gh stack view --json`, or the PR shows a stack on GitHub), check out
with `gh stack checkout <pr>` after the ws claim, update with `gh stack sync`, and resolve conflicts with
`gh stack rebase` / `gh stack rebase --continue` (see the `stack` skill). Then continue at step 4 for every open
layer, lowest first.

Otherwise: PRs are squash-merged and CI checks every commit message, so **rebase**; a merge commit would fail the
conventional commit check.

```sh
git fetch origin
git rebase origin/main
```

For each conflict: read both sides and the commits that made them (`git log -p origin/main -- <file>`), keep the
intent of both, and never drop main's changes to make the branch's version win. Regenerate rather than hand-merge
generated files: rerun drizzle-kit for migration snapshots and journal (renumber the branch's migration after
main's), and `bun install` for `bun.lock`. Continue with `git rebase --continue`. If a conflict needs a product
decision, `git rebase --abort` and ask.

Then rerun `bun run affected` and `bun run lint:workspace` (`just db-up` first if db tests are affected), fix
anything the new main broke, and push with `git push --force-with-lease`.

## 4. Feedback

Run `resolve-coderabbit` for the PR. If the rebase changed a lot, re-request Copilot once
(`gh pr edit <pr> --add-reviewer "@copilot"`) and wait for it with
`.claude/scripts/wait-for-review.sh <pr> copilot` in the background.

## 5. Finish the work

Compare the issue's acceptance criteria with what the branch does. If anything is missing, continue from step 4 of
the `work-issue` skill (build, review, push, feedback loop) until it is complete.

Report: what was picked up, rebase result (conflicts and how they were resolved), feedback handled, remaining
work, and PR state.
