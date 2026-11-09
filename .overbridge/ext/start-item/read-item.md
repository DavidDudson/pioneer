# Reading a pioneer item

- No id given ("next"): take the Ready item with the lowest Order on the project board.

  ```sh
  gh project item-list 2 --owner DavidDudson --limit 200 --format json \
    | jq '[.items[] | select(.status == "Ready")] | sort_by(.order) | .[0]'
  ```

- Read the issue with comments, its parent epic, its sub-issues and the docs it links.
- Blocked? `gh api repos/{owner}/{repo}/issues/<n>/dependencies/blocked_by -q '[.[] | select(.state == "open") |
.number]'`.
  Anything open: stop and report the blockers.
- Epic (`type:epic` label)? It is never built as one PR. It is delivered as a stack: one story sub-issue per layer,
  bottom to top by blocked-by order, about five layers (split a bigger epic into consecutive stacks). If the epic has
  no story sub-issues, create them without asking (standing policy) and show the list:
  - each story is one vertical slice, in build order;
  - `gh issue create --title "<conventional-style summary>" --body-file - --label "type:story,area:<area>,<priority>"
--milestone "<epic's milestone>"`
    with Behaviour, Acceptance criteria, Full-stack slice and Blocked by sections;
  - attach with `gh api "repos/{owner}/{repo}/issues/<epic>/sub_issues" -F sub_issue_id=<story database id>`
    (`gh api repos/{owner}/{repo}/issues/<n> -q .id`);
  - chain them: story k is blocked by story k-1 via
    `gh api -X POST "repos/{owner}/{repo}/issues/<story>/dependencies/blocked_by" -F issue_id=<blocker database id>`.
    A story too big for one PR is split the same way.
- Move the epic to In progress on the board when its first story starts.
