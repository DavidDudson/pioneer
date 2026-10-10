#!/usr/bin/env bash
# Upload screenshots for a PR and print Markdown image links for its body.
#
#   .claude/scripts/pr-screenshots.sh <pr-or-branch> <image>...
#
# GitHub has no API for PR image attachments, so images go to the orphan
# `pr-screenshots` branch (created on first use) under pr/<pr-or-branch>/,
# through the contents API: nothing is checked out and the feature branch
# never carries binaries. Name files <screen>-before.png / <screen>-after.png;
# re-uploading a name replaces it. Links pin the upload commit, so a replaced
# image never shows stale from cache.
set -euo pipefail

key="${1:?usage: pr-screenshots.sh <pr-or-branch> <image>...}"
shift
[ "$#" -gt 0 ] || { echo "usage: pr-screenshots.sh <pr-or-branch> <image>..." >&2; exit 64; }
branch=pr-screenshots
repo="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
dir="pr/${key//\//-}"

if ! gh api "repos/$repo/branches/$branch" >/dev/null 2>&1; then
  readme="$(printf '%s\n' "Screenshots for PR descriptions, uploaded by .claude/scripts/pr-screenshots.sh. Never merged." | base64 -w0)"
  blob="$(gh api "repos/$repo/git/blobs" -f content="$readme" -f encoding=base64 -q .sha)"
  tree="$(gh api "repos/$repo/git/trees" -f 'tree[][path]=README.md' -f 'tree[][mode]=100644' \
    -f 'tree[][type]=blob' -f "tree[][sha]=$blob" -q .sha)"
  commit="$(gh api "repos/$repo/git/commits" -f message="chore: start pr-screenshots branch" -f tree="$tree" -q .sha)"
  gh api "repos/$repo/git/refs" -f ref="refs/heads/$branch" -f sha="$commit" >/dev/null
fi

for file in "$@"; do
  name="$(basename "$file")"
  path="$dir/$name"
  existing="$(gh api "repos/$repo/contents/$path?ref=$branch" -q .sha 2>/dev/null || true)"
  sha="$(base64 -w0 "$file" |
    jq -Rs --arg msg "chore: screenshot $path" --arg branch "$branch" --arg sha "$existing" \
      '{message: $msg, branch: $branch, content: .} + (if $sha == "" then {} else {sha: $sha} end)' |
    gh api -X PUT "repos/$repo/contents/$path" --input - -q .commit.sha)"
  printf '![%s](https://raw.githubusercontent.com/%s/%s/%s)\n' "${name%.*}" "$repo" "$sha" "$path"
done
