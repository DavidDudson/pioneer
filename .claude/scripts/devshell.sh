#!/usr/bin/env bash
# Run a command inside the repo's Nix devshell, entering it only when this shell is not already in it.
#
#   .claude/scripts/devshell.sh git commit -m "..."     # the pre-commit hooks (typos, oxlint, ...) live in the devshell
#   .claude/scripts/devshell.sh git push
#
# The agent's shell does not load direnv, so nothing from `.envrc` (`use flake`) is on PATH there. Checks go through
# run-check.sh, which calls this after taking its turn.
set -euo pipefail

if [ "$#" -eq 0 ]; then
  echo "usage: devshell.sh <command> [args...]" >&2
  exit 2
fi

# Already in the shell, or the caller is entering it itself.
if [ -n "${IN_NIX_SHELL:-}" ] || [ "$1" = "nix" ]; then
  exec "$@"
fi
exec nix develop -c "$@"
