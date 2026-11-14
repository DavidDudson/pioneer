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

# API + web dev servers (web:serve pulls in api:serve). Ports are offset per overbridge workspace, see flake.nix.
dev: db-up
    #!/usr/bin/env bash
    set -euo pipefail
    echo $$ > .data/dev.pid
    exec bunx nx serve web --port="$WEB_PORT"

# `just dev` behind a public Cloudflare quick tunnel (random https://*.trycloudflare.com URL). DEV SIGN-IN IS OPEN TO
# ANYONE WITH THE URL: share it only with people you trust, and stop it with ctrl-c or `just down`.
expose: db-up
    #!/usr/bin/env bash
    set -euo pipefail
    echo $$ > .data/dev.pid
    log=.data/tunnel.log
    : > "$log"
    cloudflared tunnel --no-autoupdate --url "http://localhost:$WEB_PORT" >"$log" 2>&1 &
    tunnel=$!
    trap 'kill "$tunnel" 2>/dev/null || true' EXIT
    url=
    for _ in $(seq 1 30); do
      url=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$log" | grep -v '^https://api\.' | head -n1 || true)
      [ -n "$url" ] && break
      kill -0 "$tunnel" 2>/dev/null || { cat "$log" >&2; exit 1; }
      sleep 1
    done
    [ -n "$url" ] || { echo "no tunnel URL after 30s, see $log" >&2; exit 1; }
    echo "pioneer is public at $url (dev sign-in open to anyone with it)"
    PUBLIC_ORIGIN="$url" DEV_EXPOSE=1 bunx nx serve web --port="$WEB_PORT" --allowed-hosts=.trycloudflare.com

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

# Foundry pf2e import at a pack's pin (ADR-0031): --pack player-core --book player-core --apply-rules <Key>,... | --apply-outcomes | --dry-run
content-import *args:
    bun tools/content-import/main.ts {{args}}

# Fetch book listings from AoN Sources pages, politely (ADR-0071): --book player-core
aon-sources *args:
    bun tools/aon-sources/main.ts {{args}}

# Stamp each book with the pf2e release it was imported from, from the pins (ADR-0031)
book-foundry-version:
    bun tools/book-foundry-version/main.ts

# Fetch each entry's page from AoN's search index, politely (ADR-0073): --book player-core
aon-pages *args:
    bun tools/aon-pages/main.ts {{args}}

# Write mapped pages and AoN URLs onto a pack's book sources, never over a set value (ADR-0070): --pack player-core
content-enrich *args:
    bun tools/enrich-content.ts {{args}}

# Set `supersedes` on remaster entries from AoN's `remaster_id` pairs (content/aon/supersedes), never repeating an id
content-supersedes:
    bun tools/enrich-supersedes.ts

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
