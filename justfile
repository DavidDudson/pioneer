# Nx runs the build graph; just only wraps things that are not project tasks.

default:
    @just --list

# Start a local Postgres in .data/ on 127.0.0.1:54329
db-up:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ ! -d "$PGDATA" ]; then
      initdb --auth=trust --no-locale --encoding=UTF8 >/dev/null
    fi
    pg_ctl status >/dev/null 2>&1 || pg_ctl start -w -l .data/postgres.log -o "-p $PGPORT -k '' -c listen_addresses=127.0.0.1"
    createdb pioneer 2>/dev/null || true
    createdb pioneer_test 2>/dev/null || true

db-down:
    pg_ctl stop

# API + web dev servers
dev: db-up
    bunx nx run-many -t serve -p api web

# Everything CI runs
check:
    bun run check

# Install git hooks (pre-commit + commit-msg)
hooks:
    prek install --hook-type pre-commit --hook-type commit-msg

# Drop and recreate the local dev database, then migrate (destroys local data)
db-reset: db-up
    dropdb --if-exists pioneer
    createdb pioneer
    bun apps/api/src/migrate.ts
