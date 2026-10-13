---
name: create-pr
description: Create a Pioneer pull request the repo's way. Reviews first, commits with a conventional message, pushes, takes before/after screenshots of UI changes, opens the PR linked to its issue, records it in the ws workspace, requests the first Copilot review and waits for Copilot and CodeRabbit. Use when the user says "create a PR", "open a PR", "ship it", "raise a PR", or when work-issue or pickup reaches the PR step.
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
use `gh stack submit` to open PRs. Review and take screenshots (step 4) as below, then follow the `stack` skill's
submit step: open each layer's PR with `gh pr create --base <layer below> --title "<conventional title>"` and
the step 5 body **before** `gh stack submit --auto`, which only links them. Its auto-generated titles fail CI's
PR-title check, and that check does not re-run when a title is edited. Then use steps 6 and 7 here to request
Copilot and wait.

## 2. Review before anything leaves the machine

Run the `review` skill with fixes enabled. Do not continue while it reports unfixed blockers or majors, or while
`bun run affected` / `bun run lint:workspace` fail. Never commit secrets, `.env` files or build output.

## 3. Commit and push

- Conventional Commits, subject at most 72 characters, lowercase after the type, body explains why. The PR is
  squash-merged, so the PR title becomes the commit subject and follows the same rules, **72 characters included**
  (`committed.toml`). CI checks it only when the PR is opened or gets new commits, never on an edit, so pass the
  final title at creation. If it is fixed later, `gh run rerun` does not help (it replays the old event's title):
  push a commit, or `gh pr close <pr> && gh pr reopen <pr>`.
- Check commits and the title locally before pushing or opening the PR:

  ```sh
  committed --no-fixup --no-wip origin/main..HEAD
  printf '%s\n' "<pr title>" | committed --commit-file -
  ```

- End commit messages with the attribution line given in the session's system reminder, if any.
- Rebase on main last: after the final commit and right before the push, run
  `git fetch origin && git rebase origin/main` (a stack: `gh stack rebase`), resolving conflicts as the `pickup`
  skill does. If it brought in new commits, re-run `bun run affected` and `bun run lint:workspace`. Nothing but
  the push and the PR comes after it.
- Push: `git push -u origin HEAD` (`--force-with-lease` when the rebase rewrote a pushed branch). If GitHub
  refuses an HTTPS push that touches `.github/workflows` (the token lacks the `workflow` scope), push over SSH
  instead:
  `git push -u git@github.com:DavidDudson/pioneer.git HEAD:<branch>`, then
  `git branch -u origin/<branch>` after a fetch.

## 4. Screenshots, before and after

Required when the diff changes anything a user can see: templates, styles, components, routes, message text
(`git diff --stat origin/main...HEAD -- apps/web libs/frontier 'libs/*/ui' 'libs/*/feature' '**/i18n/*.json'`).
Skip only for changes with no visible effect, and say so in the PR body (`No UI change.`).

Every changed screen or component gets a **before** (main) and an **after** (this branch), same viewport, same
data, same state (open menus, errors, empty states). A brand-new screen has no before: write `New screen` in its
place. Name files `<screen>-before.png` / `<screen>-after.png` in the scratchpad.

### What to capture

- **Pages** in the running app: `just dev` in the background (Postgres, API on `$API_PORT`, web on `$WEB_PORT`;
  ports are offset per ws workspace). `just db-reset` reseeds if the data is wrong; it wipes local data, so ask
  first.
- **Components** in Storybook, for `ui` and frontier components with a story (ADR-0028):
  `bunx nx storybook frontier` (port 6007) or `bunx nx storybook rules-ui` (6008); `apps/storybook` (6006) composes
  both. Pass `--port <n>` if another workspace already holds the port. Find story ids at `/index.json`, then
  screenshot the bare story: `http://localhost:<port>/iframe.html?id=<story-id>&viewMode=story`. Prefer Storybook for a
  component change; add a page shot when the change shows up in a page too.

### Signing in: the dev bypass

Pages behind auth need no OAuth. The dev API entrypoint (`apps/api/src/main.dev.ts`, loopback only, never in the
production binary) mounts `GET /api/auth/dev/:userId`, which starts a session for a seeded dev user and redirects
to `returnTo`. One navigation signs in and lands on the page:

```text
http://localhost:$WEB_PORT/api/auth/dev/00000000-0000-4000-8000-00000000de01?returnTo=/characters
```

Ids are in `libs/identity/dev-users/src/dev-users.ts` (`DEV_USERS`; `de01` is the Dev GM, `de02`/`de03` the
players). Only seeded ids work; anything else is a 404. `returnTo` must be a same-site path. Cross-site requests
get a 403, so open the URL directly; don't link to it from another origin.

### Taking the shots

Any of these works; use whichever is connected:

- **Playwright MCP** (`mcp__playwright__*`): `browser_resize` to 1280x800, `browser_navigate` to the dev sign-in
  URL or story, then `browser_take_screenshot` with a `filename` in the scratchpad (`fullPage: true` for long
  pages).
- **Claude in Chrome** (`mcp__claude-in-chrome__*`): load its tools first, open a new tab, `navigate`, then
  `computer` with `action: screenshot` and `save_to_disk: true`; the result gives the saved path. Keep the window
  size the same for before and after (`resize_window`).
- **Playwright CLI**, no browser session needed: `bunx playwright screenshot --viewport-size=1280,800
[--full-page] "<url>" <file>.png`. It follows the dev sign-in redirect, so the sign-in URL works as is.

Look at every image before uploading it: right screen, no error overlay, no spinner, no stray dev data.

### Getting the before

Best: capture befores **before the first edit** (work-issue step 3), from the clean branch. Otherwise run main
beside the branch in a detached worktree, on its own ports and database so it does not clash with the branch's dev
servers or its migrations:

```sh
base="$(git merge-base origin/main HEAD)"
before="<scratchpad>/before"
git worktree add --detach "$before" "$base"
cd "$before" && bun install --frozen-lockfile
export API_PORT=$((API_PORT + 100)) WEB_PORT=$((WEB_PORT + 100)) NX_DAEMON=false
export DATABASE_URL="postgres://$USER@127.0.0.1:$PGPORT/pioneer_before" PUBLIC_ORIGIN="http://localhost:$WEB_PORT"
createdb pioneer_before 2>/dev/null || true
bun apps/api/src/main.dev.ts seed
bunx nx serve web --port="$WEB_PORT"      # background; Storybook: bunx nx storybook <project> --port <n+100>
```

Afterwards stop those servers, `dropdb pioneer_before` and `git worktree remove --force "$before"`.

### Upload

```sh
.claude/scripts/pr-screenshots.sh <branch> <scratchpad>/*-before.png <scratchpad>/*-after.png
```

It commits the images to the orphan `pr-screenshots` branch (never merged, never on the feature branch) and
prints a Markdown image link per file. Put them in the PR body's Screenshots table. After review fixes that change
the UI, retake the afters and re-run the script with the same names, then update the PR body.

## 5. Open the PR

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

## Screenshots

| Screen            | Before                         | After        |
| ----------------- | ------------------------------ | ------------ |
| <screen or story> | <before link, or `New screen`> | <after link> |

<links from .claude/scripts/pr-screenshots.sh; or `No UI change.` and delete the table>

## Testing

<commands run and their results; what was not run and why>

## Review

<summary of the review skill: personas run, findings fixed, anything left PLAUSIBLE for a human>

<PR attribution line from the system reminder, if any>
EOF
```

`Closes #n` links the PR so the board moves the issue to In progress and to Done on merge.

Then, inside a ws workspace: `ws pr <repo>`.

## 6. Request the first Copilot review

Copilot does not review automatically. Request it once, right after creating the PR:

```sh
gh pr edit <pr> --add-reviewer "@copilot"
```

Re-request it (same command) only after substantial new commits, never in a loop.

## 7. Wait for reviewers

Start the waits with the Bash tool's `run_in_background`; you are notified when each exits.

```sh
.claude/scripts/wait-for-review.sh <pr> copilot      # Copilot's review on the head commit
.claude/scripts/wait-for-review.sh <pr> coderabbit   # CodeRabbit finished the head commit
.claude/scripts/wait-for-review.sh <pr> ci           # every check finished
```

Exit 0 is done, 1 is CI failed, 2 is timed out (default 30 minutes; say so and stop rather than polling more).

When the reviewers are done, hand over to the `resolve-coderabbit` skill, which handles Copilot's threads too.
Report the PR URL and the state of CI and reviews.
