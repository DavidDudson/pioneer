# Screenshots for UI changes

Required when the diff changes anything a user can see: templates, styles, components, routes, message text
(`git diff --stat origin/main...HEAD -- apps/web libs/frontier 'libs/*/ui' 'libs/*/feature' '**/i18n/*.json'`).
Otherwise the PR body says `No UI change.`

Every changed screen or component gets a before (main) and an after (this branch): same viewport (1280x800), data
and state. A new screen has no before: write `New screen`. Name files `<screen>-before.png` and `<screen>-after.png`.

## What to capture

- Pages: the workspace's web app (`overbridge app start web`; ports are offset per workspace, see `$WEB_PORT` and
  `$API_PORT` in the dev shell). `just db-reset` reseeds, and it wipes local data, so ask first.
- Components, for `ui` and frontier components with a story (ADR-0028): `bunx nx storybook frontier` (port 6007) or
  `bunx nx storybook rules-ui` (6008); `apps/storybook` (6006) composes both. Pass `--port <n>` if the port is held.
  Find story ids at `/index.json`, then shoot `http://localhost:<port>/iframe.html?id=<story-id>&viewMode=story`.
  Prefer Storybook for a component change; add a page shot when the change shows in a page too.

## Signing in: the dev bypass

Pages behind auth need no OAuth. The dev API (`apps/api/src/main.dev.ts`, loopback only) mounts
`GET /api/auth/dev/:userId`, which starts a session for a seeded dev user and redirects to `returnTo`:

```text
http://localhost:$WEB_PORT/api/auth/dev/00000000-0000-4000-8000-00000000de01?returnTo=/characters
```

Ids are in `libs/identity/dev-users/src/dev-users.ts` (`de01` is the Dev GM, `de02` and `de03` the players). Only
seeded ids work. `returnTo` must be a same-site path. Cross-site requests get a 403, so open the URL directly.

## The before

Best: capture it before the first edit, from the clean branch. Otherwise run main in a detached worktree on its own
ports and database so it does not clash with the branch:

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

Afterwards stop those servers, `dropdb pioneer_before` and remove the worktree with `git worktree remove --force`.

## Upload

```sh
.claude/scripts/pr-screenshots.sh <branch> <scratchpad>/*-before.png <scratchpad>/*-after.png
```

It commits the images to the orphan `pr-screenshots` branch (never merged) and prints a Markdown image link per
file for the PR body's Screenshots table. Look at every image first: right screen, no error overlay, no spinner, no
stray dev data. After review fixes that change the UI, retake the afters, rerun the script with the same names and
update the PR body.
