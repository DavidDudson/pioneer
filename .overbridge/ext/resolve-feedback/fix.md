# Applying fixes in pioneer

- Verify with small, cheap checks only, each through `overbridge check pioneer -- <command>` (it waits for CPU and
  queues behind other workspaces): oxlint on the changed files, the touched project's typecheck, and the specs next to
  the change. Never `bun run affected`, `nx affected` or `bun run lint:workspace` locally; CI runs them.
- Commit and push through `overbridge shell pioneer -- git ...` (the hooks live in the dev shell).
- If CI fails, read the failing job (`gh run view <id> --log-failed`), fix the cause, push, and wait again.
