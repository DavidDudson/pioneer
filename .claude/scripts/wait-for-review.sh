#!/usr/bin/env bash
# Block until a PR reviewer or CI has finished for the current head commit.
#
#   .claude/scripts/wait-for-review.sh <pr> <copilot|coderabbit|ci> [timeout-seconds]
#
# Run it with the Bash tool's run_in_background so the session is notified
# when it exits. Exit 0: done. Exit 1: CI failed. Exit 2: timed out.
set -euo pipefail

pr="${1:?usage: wait-for-review.sh <pr> <copilot|coderabbit|ci> [timeout]}"
who="${2:?usage: wait-for-review.sh <pr> <copilot|coderabbit|ci> [timeout]}"
timeout="${3:-1800}"
interval=30
repo="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
head="$(gh pr view "$pr" --json headRefOid -q .headRefOid)"
deadline=$((SECONDS + timeout))

reviewed_by() {
  # A submitted review on the head commit from a login matching $1.
  gh api "repos/$repo/pulls/$pr/reviews" --paginate \
    -q "[.[] | select((.user.login | test(\"$1\"; \"i\")) and .commit_id == \"$head\")] | length"
}

check_bucket() {
  # Bucket (pass|fail|pending|skipping|cancel) of checks whose name matches $1, worst first.
  gh pr checks "$pr" --json name,bucket \
    -q "[.[] | select(.name | test(\"$1\"; \"i\")) | .bucket] | if any(. == \"pending\") then \"pending\" elif any(. == \"fail\" or . == \"cancel\") then \"fail\" elif length == 0 then \"none\" else \"pass\" end" \
    2>/dev/null || echo pending
}

while ((SECONDS < deadline)); do
  case "$who" in
    copilot)
      if (($(reviewed_by copilot) > 0)); then echo "copilot reviewed $head"; exit 0; fi
      ;;
    coderabbit)
      state="$(check_bucket coderabbit)"
      if [[ "$state" == pass || "$state" == fail ]]; then echo "coderabbit $state on $head"; exit 0; fi
      if (($(reviewed_by coderabbit) > 0)); then echo "coderabbit reviewed $head"; exit 0; fi
      ;;
    ci)
      state="$(check_bucket '.')"
      case "$state" in
        pass) echo "checks passed on $head"; exit 0 ;;
        fail) echo "checks failed on $head"; gh pr checks "$pr" || true; exit 1 ;;
        *) ;;
      esac
      ;;
    *)
      echo "unknown reviewer: $who" >&2
      exit 64
      ;;
  esac
  sleep "$interval"
done
echo "timed out after ${timeout}s waiting for $who on $head"
exit 2
