#!/usr/bin/env bash
# Run one lint/typecheck/test command when the machine is idle enough, one workspace at a time.
#
#   .claude/scripts/run-check.sh bunx nx run content-feature:test --include="**/entry-page.component.spec.ts"
#
# Every workspace shares one lock (`$WS_ROOT/.check-queue.lock`, default ~/workspaces), so concurrent sessions queue
# instead of competing for CPU. Before taking its turn it waits until the 1-minute load average is under
# MAX_LOAD_PERCENT (default 70) of the core count, then holds the lock while the command runs.
#
# The command runs in the Nix devshell (devshell.sh), entered here when the caller's shell is not in it. A command
# started from inside a run-check (a git hook that calls it, say) already holds the turn and runs at once, so
# nesting cannot deadlock on the lock.
#
# Env: MAX_LOAD_PERCENT (default 70), CHECK_WAIT_SECONDS (give up after this long, default 900).
set -euo pipefail

if [ "$#" -eq 0 ]; then
  echo "usage: run-check.sh <command> [args...]" >&2
  exit 2
fi

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -n "${RUN_CHECK_HELD:-}" ]; then
  exec "$here/devshell.sh" "$@"
fi

root="${WS_ROOT:-$HOME/workspaces}"
lock="$root/.check-queue.lock"
max_percent="${MAX_LOAD_PERCENT:-70}"
give_up="${CHECK_WAIT_SECONDS:-900}"
cores="$(nproc)"
limit=$((cores * max_percent / 100))
started="$(date +%s)"

# Queue for the lock first, so waiting workspaces take turns in order, then wait for the CPU to settle inside it.
exec 9>"$lock"
echo "run-check: waiting for the check queue (${lock})" >&2
flock -w "$give_up" 9 || { echo "run-check: queue still busy after ${give_up}s" >&2; exit 75; }

while :; do
  load="$(cut -d' ' -f1 /proc/loadavg)"
  load_int="${load%.*}"
  if [ "$load_int" -lt "$limit" ]; then
    break
  fi
  if [ $(($(date +%s) - started)) -ge "$give_up" ]; then
    echo "run-check: load ${load} stayed over ${limit} (${max_percent}% of ${cores} cores) for ${give_up}s" >&2
    exit 75
  fi
  echo "run-check: load ${load} is over ${limit} (${max_percent}% of ${cores} cores), waiting" >&2
  sleep 15
done

echo "run-check: load ${load}, running: $*" >&2
export RUN_CHECK_HELD=1
"$here/devshell.sh" "$@"
