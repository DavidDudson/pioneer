# 0062. User content is archived, never deleted

- Status: Accepted
- Date: 2026-10-15

## Context

Characters, campaigns and homebrew packs are things people build over months. Other rows point at them: a party holds
characters, a campaign enables packs, a character document names its content, a bug report names a character. Deleting
one either breaks those references or cascades through them, and neither can be undone. Nothing deletes them today; the
first delete endpoint would.

## Decision

- **User content is archived, never deleted.** The word is _archived_ everywhere: column, endpoints, messages, tests. Not
  "deleted", "removed" or "soft-deleted".
- An archivable table has a nullable `archived_at timestamptz`. `null` is live. Archiving sets it; restoring clears it.
  Both are idempotent, owner-only, audited, and bump nothing else.
- **Archived content is missing to everyone else.** Lists, reads, edits and anything derived from it skip it, and an
  archived id answers 404 like an unknown one. Only the owner's archived list and restore see it. A reference from other
  content keeps working: it shows an archived placeholder (a party's archived character) rather than disappearing.
- **No row is deleted, and the database says so.** `archive.protect('table')` (migration 0022) adds triggers that reject
  `DELETE` and `TRUNCATE`; the migration that adds `archived_at` calls it. `pioneer/no-archivable-delete` reports
  `.delete(table)` on a listed table before it runs. A table joins `ARCHIVABLE_TABLES` in the same change.
- **Owner foreign keys to `users` are `restrict`, not `cascade`.** A user with content cannot be removed until a later
  story decides to anonymise or transfer it.
- **Exempt:** rows that are state, not content. Pack and variant-rule enablement toggles, campaign membership and party
  links, invites, sessions, and the content seed's prune stay hard deletes.

## Consequences

- Storage only grows. Acceptable at this scale; a later story can add a retention policy, which is the one place a
  protected table would be deliberately emptied (by dropping the trigger in its own migration, in the open).
- Every query on an archivable table filters `archived_at IS NULL`. The repositories do it once; services and other
  contexts go through them.
- Tests that checked a cascade on delete now check that archiving leaves the children alone.
- Unique indexes on archivable tables stay as they are: an archived row still holds its slug until restored.
