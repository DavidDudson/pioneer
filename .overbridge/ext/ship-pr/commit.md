# Commit and PR title convention

- Conventional Commits, subject at most 72 characters, lowercase after the type, body explains why. Types match
  `committed.toml`. This overrides the 50-character default.
- The PR is squash-merged, so the PR title becomes the commit subject and follows the same rules, 72 characters
  included. CI checks it only when the PR is opened or gets new commits, never on an edit, so pass the final title
  at creation. If it has to change later, `gh run rerun` replays the old title: push a commit, or
  `gh pr close <pr> && gh pr reopen <pr>`.
- Check locally before pushing or opening the PR:

  ```sh
  committed --no-fixup --no-wip origin/main..HEAD
  printf '%s\n' "<pr title>" | committed --commit-file -
  ```

- Commit and push through the dev shell, because the pre-commit and pre-push hooks (`prek`) live in it:
  `.claude/scripts/devshell.sh git commit ...` and `.claude/scripts/devshell.sh git push -u origin HEAD`. A hook that
  reformats a file aborts the commit: restage and commit again. Use `--force-with-lease` when a rebase rewrote a
  pushed branch.
- If GitHub refuses an HTTPS push that touches `.github/workflows` (the token lacks the `workflow` scope), push over
  SSH: `git push -u git@github.com:DavidDudson/pioneer.git HEAD:<branch>`, then `git branch -u origin/<branch>`
  after a fetch.
- Rebase on main last: after the final commit and right before the push, `git fetch origin && git rebase origin/main`
  (a stack: `gh stack rebase`). Squash merges plus the per-commit message check mean a merge commit would fail CI.
  Regenerate rather than hand-merge generated files: rerun drizzle-kit for migration snapshots and the journal
  (renumber the branch's migration after main's), and `bun install` for `bun.lock`. Re-run the small local checks for
  files the rebase touched.
- Branch names are `<type>/<issue>-<slug>`, for example `feat/7-i18n-foundation`.
