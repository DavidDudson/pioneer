# 0011. One compiled API binary; migrations ship beside it

- Status: Proposed
- Date: 2026-10-09

## Context

Epic 10.1 packages Pioneer as one container image: the API serving the built web app on one origin, with
Postgres migrations applied on deploy. The API already compiles to a single executable with `bun build --compile`,
but three things stopped that binary running outside the repo:

- Migrations were found through `import.meta.dir`, which inside a compiled binary points into Bun's virtual
  filesystem (`/$bunfs/...`). Drizzle's migrator reads the folder from the real filesystem, so it found nothing.
- The build target was hardcoded to `bun-linux-x64`; the image is published for x64 and arm64.
- Every instance migrated on start, and Drizzle's migrator takes no lock, so instances starting together raced
  on the same migrations.

The alternatives considered:

- **Embed the migrations in the binary** (`bun build --compile` with the SQL files as embedded assets). The binary
  would be self-contained, but Drizzle's migrator only takes a folder path, so the files would be extracted to a
  temp folder at runtime. The migrations would also be invisible to anyone inspecting the image.
- **A second entry point or binary for migrating** (`pioneer-migrate`). This is a clean split, but it doubles the
  build and image contents for a dozen lines of code.
- **Only ever migrate from a separate job**. This is the safe default with several instances, but a single
  instance (and local development) would then need an extra step for no benefit.

## Decision

- **Migrations ship as files beside the binary.** `MIGRATIONS_DIR` names their folder. It defaults to the repo's
  `apps/api/migrations`, so development needs no setting; a compiled binary must set it, and fails with an error
  naming the variable when the folder has no journal.
- **One binary, two commands.** `pioneer-api` serves; `pioneer-api migrate` applies migrations and exits. The
  migrate command validates only `DATABASE_URL` and `MIGRATIONS_DIR`, so a migrate job needs no OAuth or web
  settings.
- **Migrate on start by default, under a lock.** `MIGRATE_ON_START` (default true) migrates before serving.
  Migrations always run while holding a Postgres session advisory lock on one reserved connection, so instances
  that start together run them one at a time, and the later ones find nothing pending. With more than one instance,
  deploys may still set `MIGRATE_ON_START=false` and run `pioneer-api migrate` once, so a failing migration stops
  the deploy rather than every instance.
- **Build targets are Nx configurations.** `nx build api` builds for the host. `-c linux-x64` and `-c linux-arm64`
  cross-compile, which needs no emulation, so a multi-arch image can build both from one runner.

## Consequences

- The Dockerfile copies `dist/apps/api/pioneer-api` and `apps/api/migrations`, and sets `MIGRATIONS_DIR`.
- A migration must be safe to run inside Drizzle's single transaction, as before; the lock adds no new limits.
- `apps/api/src/binary.db.test.ts` compiles the binary and runs it against Postgres with migrations outside the
  source tree, including several `migrate` commands at once.
- Embedding the migrations stays open if a later host wants a single file; it would supersede the first decision.
