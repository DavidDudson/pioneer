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
    # exec keeps nx in the foreground with the TTY, so there is no shell left to
    # clean up the pid file; `down` checks ownership before trusting it.
    echo $$ > .data/dev.pid
    exec bunx nx serve web --port="$WEB_PORT"

# Stop the dev servers (from any terminal) and Postgres
down: && db-down
    #!/usr/bin/env bash
    set -uo pipefail
    # Only signal processes running from this checkout: the pid file may be stale
    # (PID reused) and the ports may be held by something else.
    owned() { [ "$(readlink "/proc/$1/cwd" 2>/dev/null)" = "$PWD" ]; }
    if [ -f .data/dev.pid ]; then
      pid=$(cat .data/dev.pid)
      if owned "$pid" && tr '\0' ' ' < "/proc/$pid/cmdline" | grep -q 'nx serve web'; then
        kill -TERM "$pid" 2>/dev/null && sleep 2
      fi
      rm -f .data/dev.pid
    fi
    # Orphaned watchers still holding this workspace's ports.
    for port in "$API_PORT" "$WEB_PORT"; do
      for pid in $(ss -ltnpH "sport = :$port" | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u); do
        if owned "$pid"; then kill -TERM "$pid" 2>/dev/null; else echo "port $port held by pid $pid outside this checkout; leaving it" >&2; fi
      done
    done
    true

# Everything CI runs
check:
    bun run check

# Install git hooks (types and hooks are in prek.toml)
hooks:
    prek install

# Drop and recreate the local dev database, then migrate (destroys local data)
db-reset: db-up
    dropdb --if-exists pioneer
    createdb pioneer
    bun apps/api/src/migrate.ts
