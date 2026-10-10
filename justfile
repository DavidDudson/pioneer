# Nx runs the build graph; just only wraps things that are not project tasks.

default:
    @just --list

# Start a local Postgres in .data/ on 127.0.0.1:$PGPORT
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
    pg_ctl status >/dev/null 2>&1 && pg_ctl stop || true

# API + web dev servers (web:serve pulls in api:serve). Ports are offset per ws workspace, see flake.nix.
dev: db-up
    #!/usr/bin/env bash
    set -euo pipefail
    echo $$ > .data/dev.pid
    exec bunx nx serve web --port="$WEB_PORT"

# Stop the dev servers (from any terminal) and Postgres
down: && db-down
    #!/usr/bin/env bash
    set -uo pipefail
    if [ -f .data/dev.pid ]; then
      kill -TERM "$(cat .data/dev.pid)" 2>/dev/null || true
      rm -f .data/dev.pid
      sleep 2
    fi
    # Anything still holding this workspace's ports (e.g. orphaned watchers).
    for port in "$API_PORT" "$WEB_PORT"; do
      pids=$(ss -ltnpH "sport = :$port" | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u)
      [ -n "$pids" ] && kill -TERM $pids 2>/dev/null || true
    done

# Everything CI runs
check:
    bun run check

# Install git hooks (types and hooks are in prek.toml)
hooks:
    prek install

# Drop and recreate the local dev database, then migrate and seed the dev users (destroys local data)
db-reset: db-up
    dropdb --if-exists pioneer
    createdb pioneer
    bun apps/api/src/main.dev.ts seed
