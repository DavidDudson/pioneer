---
name: stack
description: Deliver a Pioneer epic as GitHub stacked PRs with the gh stack extension - one story sub-issue per layer, bottom to top in dependency order, each layer a full-stack slice with its own PR. Covers creating the stack, adding layers, submitting, syncing with main, restacking after review fixes, and merging. Use when the user mentions stacks, stacked PRs, "gh stack", or when work-issue picks up an epic or a story too large for one PR.
argument-hint: '<epic-number> | sync | submit | view | merge'
---

# Stacked PRs for epics

Policy: **an epic is delivered as a stack.** Each story is a sub-issue of the epic, one layer of the stack, one
PR that closes that story. Layers are ordered by the stories' blocked-by links (bottom = first to build). Each
layer is still a full-stack slice that passes `bun run affected` on its own. Keep stacks to about five layers;
split a bigger epic into consecutive stacks.

Tooling: GitHub's native stacked PRs through `gh stack` (`github/gh-stack`). Check with `gh stack --help`; if it
is missing, install it with `gh extension install github/gh-stack` after asking the user.

## 1. Stories first

```sh
gh issue view <epic> --json title,body,labels,milestone
gh api "repos/{owner}/{repo}/issues/<epic>/sub_issues" -q '[.[] | {number, title, state}]'
```

If the epic has no story sub-issues, create them. This is standing policy; do not wait for approval, but show the
list in your report.

- Split the epic's scope into stories that are each one vertical slice (migration, domain/engine, contract, API,
  Angular feature, `en` message keys, tests as needed), in build order.
- Create each with the story template's sections (Behaviour, Acceptance criteria, Full-stack slice, Blocked by):

  ```sh
  gh issue create --title "<conventional-style summary>" --body-file - \
    --label "type:story,area:<area>,<priority>" --milestone "<epic's milestone>"
  ```

- Attach to the epic: `gh api "repos/{owner}/{repo}/issues/<epic>/sub_issues" -F sub_issue_id=<story database id>`
  (database id: `gh api repos/{owner}/{repo}/issues/<n> -q .id`).
- Chain them: story k is blocked by story k-1 when it builds on it:
  `gh api -X POST "repos/{owner}/{repo}/issues/<story>/dependencies/blocked_by" -F issue_id=<blocker database id>`.

## 2. Create the stack

Branch per layer: `<type>/<story>-<slug>`. In a ws workspace, claim the bottom branch first so the work belongs
to this workspace, then let `gh stack` create the rest on top of it:

```sh
ws checkout pioneer feat/101-locale-core      # bottom layer, claimed by this workspace
gh stack init feat/101-locale-core            # adopt it as a stack on main
# build layer 1, commit (conventional), run review skill
gh stack add feat/102-route-scopes            # new layer on top, switches to it
# build layer 2 ...
```

`gh stack up`, `gh stack down`, `gh stack top`, `gh stack bottom` and `gh stack checkout` move between layers of
this stack; they are fine inside the workspace. Never use them to reach branches another workspace claims. Keep
the ws claim on the layer being worked (`ws checkout pioneer <branch>` when you switch focus for a long session)
and run `ws pr pioneer` after PRs exist.

Work bottom-up. Finish, review and commit a layer before adding the next. If a lower layer needs a change, go
down, fix it there, and restack (below), rather than patching it in a higher layer.

## 3. Submit

Each layer passes the `review` skill before it is submitted.

**Open each PR with its final title before `gh stack submit`.** CI's PR-title check (`committed` in `ci.yml`)
runs only on `opened`, `synchronize` and `reopened`, not `edited`. `gh stack submit --auto` opens PRs with
auto-generated, non-conventional titles, so the check fails at once, and retitling afterwards never re-runs
it. Create each layer's PR yourself, bottom-up, then let `submit` link them:

```sh
git push -u origin <layer-branch>
gh pr create --head <layer-branch> --base <branch below, or main for the bottom layer> --draft \
  --title "<conventional title>" --body-file -   # create-pr template, `Closes #<story>`,
                                                  # `Part of #<epic> (stack layer k of n)`
# repeat for every layer that has no PR yet, then:
gh stack submit --auto            # pushes, keeps the existing PRs and their titles, links the stack
```

Check `gh pr list --head <branch> --json title` afterwards: every title must be conventional and at most 72
characters (see `create-pr`). Then for every PR in the stack (`gh stack view --json`):

- Mark ready when the layer is complete: `gh pr ready <pr>`.
- Request Copilot once per PR: `gh pr edit <pr> --add-reviewer "@copilot"`.
- Wait for reviewers per PR with `.claude/scripts/wait-for-review.sh <pr> <copilot|coderabbit|ci>` in the
  background, then run `resolve-coderabbit` per PR, lowest layer first.
- If a title ever has to change after the PR is open, the check needs a new event: it reads
  `github.event.pull_request.title`, and `gh run rerun` replays the old payload with the old title. Push the
  next commit (a `synchronize` event carries the new title), or with nothing to push,
  `gh pr close <pr> && gh pr reopen <pr>`.

## 4. Keep it current

```sh
gh stack sync                     # fetch, fast-forward main, cascade-rebase every layer, push with lease
```

If sync reports a conflict, it restores everything; resolve with `gh stack rebase`, fix conflicts layer by layer
(same rules as the `pickup` skill: keep both intents, regenerate migrations and lockfiles), then
`gh stack rebase --continue`. After review fixes on a lower layer, `gh stack rebase --upstack` from that layer,
then `gh stack push`.

## 5. Merge

The user merges. When asked: `gh stack merge <pr>` merges every layer up to and including that PR atomically. With
squash merging, each layer's PR title becomes the commit on main, so titles must be conventional. After a partial
merge, `gh stack sync` drops merged layers and rebases the rest.

## Report

Show `gh stack view --short`, each layer's PR, CI and review state, and which stories are done.
