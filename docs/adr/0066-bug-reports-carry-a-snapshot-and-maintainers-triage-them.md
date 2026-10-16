# 0066. Bug reports carry a snapshot, and maintainers triage them

- Status: Proposed
- Date: 2026-10-16

## Context

A signed-in user can report a bug from the account menu or a character sheet (#658). A maintainer needs to reproduce it
without asking the reporter for a build, so a report can carry the character, and a maintainer needs somewhere to read
reports and say where each stands.

Alternatives for the destination:

- **A GitHub issue per report.** Triage would live where the work is, but the snapshot is a user's whole character, and
  an issue body in a public repository publishes it, with history that survives an edit or a delete. An issue body is
  also capped at 65,536 characters, which a level 20 character with embedded homebrew can exceed. It would need a
  GitHub token in the API's environment. The epic left it out of scope and it stays out.
- **Reports in the database, read in the app.** The snapshot stays with the data it came from, access is the app's own
  role check, and nothing leaves the deployment. This is the decision.

## Decision

- **The snapshot is the Pioneer character file** (ADR-0056): the stored inputs, never derived values (ADR-0004), with
  the file's `format` and `formatVersion`. It is taken once, when the report is filed, and stored as `jsonb` on the
  report. Editing, archiving or deleting the character never changes it.
- **Identity does not import character or interop.** It defines `CharacterSnapshotSource`; the composition root wires it
  to the Pioneer file export, which applies the owner-only policy. The server reads the character itself; the client
  sends only `shareCharacter`, which is off unless sent. The form ticks it by default and the reporter can untick it.
- **A character that cannot be copied never blocks a report.** If it is gone, not the reporter's, or refused by the
  export, the report is filed without a snapshot and the receipt says `snapshotTaken: false`.
- **Maintainers are an account role** (`users.role`: `member` or `maintainer`), granted from the command line
  (`pioneer-api grant-maintainer <user-id>`) and never by a request. `BugReportTriageService` checks it on every call,
  and to anyone else the list, one report and its status are a 404, so a member learns nothing.
- **Status is open, confirmed, fixed or declined**, set by a maintainer. The list is the newest 100, newest first.
- **The sheet has no read-only mode**, so a maintainer saves the snapshot as a Pioneer character file and opens it with
  the character import. It becomes a copy of their own, which also lets them reproduce the bug.

## Consequences

- Reports are as private as the database. A maintainer sees every shared character, so the form says it is shared with
  maintainers.
- Granting the role needs shell access to the deployment, which suits a project with a few maintainers.
- A maintainer's copy is editable and adds a character to their list. A true read-only sheet would touch every tab and
  is left for when something else needs it.
- The list stops at 100. Paging comes when there are more reports than that.
