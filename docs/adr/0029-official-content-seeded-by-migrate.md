# 0029. Official content is seeded by `migrate`, one hash-checked transaction per pack

- Status: Proposed
- Date: 2026-10-11

## Context

Story #324 moves the official packs under `content/packs` into Postgres (`content_packs`, `content_entries`,
`content_pack_deps`) so the API can read content from the database (#325). The seed has to run on every deploy, be
cheap when nothing changed, never leave a pack half written, and keep rollbacks working. ADR-0011 gave the binary a
`migrate` command that the deploy runs before switching images. ADR-0024 expected Epic 2.3 to seed a `content_books`
table from the book registry.

Alternatives: a separate deploy step running a new `content-seed` command (an image older than it cannot run it, so
rolling back to one would fail the deploy); seeding on every server start (Lambda starts often and sets
`MIGRATE_ON_START=false`); diffing entries row by row on every run instead of comparing a hash.

## Decision

- `pioneer-api migrate` applies migrations and then seeds the official packs compiled into the binary. The deploy
  still runs only `migrate`. `pioneer-api content-seed` (`bun run content:seed`) seeds without migrating, and
  `MIGRATE_ON_START` and the dev server seed after migrating.
- Each pack is one transaction under a per-pack advisory lock: the pack row and its entries are upserted, entries no
  longer in the pack are deleted, and a failure leaves the pack as it was. Every pack is loaded and checked against
  its schema and the book registry before anything is written.
- `content_packs.content_hash` is SHA-256 of the pack's canonical JSON (sorted keys, entries sorted by id) plus a
  seed format number. A pack whose hash is stored is skipped without writing; bumping the format reseeds every pack.
- `data jsonb` holds the whole `pack.json` or `ContentEntry`; the other columns copy fields to filter on.
- There is no `content_books` table, superseding that consequence of ADR-0024: the registry stays the only list of
  books, and entries cite books by id.

## Consequences

- Rolling back to an image older than #324 deploys as before; it migrates and seeds nothing. A rollback to a newer
  image writes its own packs back; packs it does not ship are left as they are.
- Content is seeded before the new image takes traffic, so content follows the migrations' expand-then-contract
  rule: once the registry reads these rows (#325), a content shape the previous image cannot read must ship in two
  deploys, the reader first.
- An official pack never overwrites a homebrew pack with the same id: the seed only updates rows without an owner.
