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
# Guards against a hung holder, which would block every other workspace:
#   - The command runs in its own session (setsid) and without the lock's file descriptor, so killing the session
#     ends it all and no stray child keeps the lock.
#   - It is killed after MAX_RUN_SECONDS (default 1500) however busy it is.
#   - Every waiter watches the holder: if the CPU time of its whole session has not moved for STALL_SECONDS
#     (default 300), the waiter kills the session (TERM, then KILL) and the queue moves on. The holder's own run-check
#     reports the kill and exits with the signal's status.
#
# Env: MAX_LOAD_PERCENT (default 70), CHECK_WAIT_SECONDS (give up after this long, default 900), MAX_RUN_SECONDS,
# STALL_SECONDS.
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
holder="$root/.check-queue.holder" # the holder's session id, workspace, start time and command
sample="$root/.check-queue.sample" # the last CPU sample any waiter took: session id, CPU seconds, since when
max_percent="${MAX_LOAD_PERCENT:-70}"
give_up="${CHECK_WAIT_SECONDS:-900}"
max_run="${MAX_RUN_SECONDS:-1500}"
stall="${STALL_SECONDS:-300}"
cores="$(nproc)"
limit=$((cores * max_percent / 100))
started="$(date +%s)"

# Total CPU seconds of every process in session $1.
session_cpu() {
  ps -eo sid=,cputimes= | awk -v sid="$1" '$1 == sid { total += $2 } END { print total + 0 }'
}

# Kill session $1: TERM first so the command can clean up, KILL for what is left.
kill_session() {
  pkill -TERM -s "$1" 2>/dev/null || true
  sleep 10
  pkill -KILL -s "$1" 2>/dev/null || true
}

# Called by a waiter. Kills the holder's session when its CPU time has stood still for STALL_SECONDS.
reap_stalled_holder() {
  local sid ws begun cmd now cpu last_sid last_cpu since
  [ -s "$holder" ] || return 0
  IFS=$'\t' read -r sid ws begun cmd <"$holder" || return 0
  pkill -0 -s "$sid" 2>/dev/null || return 0
  now="$(date +%s)"
  cpu="$(session_cpu "$sid")"
  last_sid="" last_cpu="" since=""
  [ -s "$sample" ] && read -r last_sid last_cpu since <"$sample" || true
  if [ "$last_sid" = "$sid" ] && [ "$last_cpu" = "$cpu" ]; then
    if [ $((now - since)) -ge "$stall" ]; then
      echo "run-check: holder from ${ws} (session ${sid}) used no CPU for $((now - since))s, killing it: ${cmd}" >&2
      kill_session "$sid"
      rm -f "$sample"
    fi
  else
    printf '%s %s %s\n' "$sid" "$cpu" "$now" >"$sample"
  fi
}

# Queue for the lock first, so waiting workspaces take turns in order, then wait for the CPU to settle inside it.
exec 9>"$lock"
echo "run-check: waiting for the check queue (${lock})" >&2
until flock -w 15 9; do
  if [ $(($(date +%s) - started)) -ge "$give_up" ]; then
    echo "run-check: queue still busy after ${give_up}s" >&2
    exit 75
  fi
  reap_stalled_holder
done

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

# Own session, no lock descriptor, hard time limit. setsid makes the command its session leader, so its pid is the
# session id the waiters watch.
setsid --wait timeout -k 10 "$max_run" "$here/devshell.sh" "$@" 9>&- &
runner=$!
printf '%s\t%s\t%s\t%s\n' "$runner" "${WS_NAME:-unknown}" "$(date +%s)" "$*" >"$holder"
trap 'rm -f "$holder" "$sample"' EXIT

status=0
wait "$runner" || status=$?
if [ "$status" -eq 124 ] || [ "$status" -eq 137 ] || [ "$status" -eq 143 ]; then
  echo "run-check: command was stopped (exit ${status}): it ran over ${max_run}s or a waiting workspace killed it as hung" >&2
fi
exit "$status"
