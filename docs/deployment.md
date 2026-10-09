# Deployment

Pioneer ships as one container image: the compiled `pioneer-api` binary serving the API under `/api` and the
built web app on the same origin, with its migrations beside it
([ADR-0011](adr/0011-api-binary-and-migrations.md), [ADR-0012](adr/0012-container-image.md)). It needs only Postgres.

## Run it with Docker Compose

On a machine with Docker (or Podman with `podman compose`):

```sh
cp .env.example .env
# Set POSTGRES_PASSWORD in .env to a long random value, e.g. `openssl rand -hex 24`.
docker compose up --build
```

Pioneer is then at <http://localhost:8080>. Compose starts Postgres first, waits for its healthcheck, and the app
migrates the database on start. Data lives in the `pgdata` volume; `docker compose down` keeps it and
`docker compose down --volumes` deletes it.

Settings, all read from `.env`:

| Variable                               | Default                 | Purpose                                                                                            |
| -------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------- |
| `POSTGRES_PASSWORD`                    | none, required          | Password of the `pioneer` database user; passed to the app as `PGPASSWORD`, so any character works |
| `PIONEER_PORT`                         | `8080`                  | Host port                                                                                          |
| `PUBLIC_ORIGIN`                        | `http://localhost:8080` | Address browsers use; OAuth callbacks are registered under it                                      |
| `GITHUB_CLIENT_ID`, `..._SECRET`, etc. | unset                   | Sign-in providers, as in `.env.example`; each is off unless both are set                           |

Nothing secret is built into the image: `.dockerignore` keeps `.env` out of the build context, and compose passes
it to the container at run time.

## The image

`Dockerfile` has two stages:

- **build** (`oven/bun`): `bun install --frozen-lockfile`, then `nx run api:build:linux-<arch>` and
  `nx run web:build:production`. It runs on the builder's own platform and cross-compiles the API, so a multi-arch
  build (`docker buildx build --platform linux/amd64,linux/arm64 .`) needs no emulation.
- **runtime** (`gcr.io/distroless/cc-debian12:nonroot`): glibc and libstdc++, nothing else, no shell. It holds
  `/app/pioneer-api`, `/app/migrations` and `/app/web`, runs as uid 65532, and sets `PORT=3000`,
  `MIGRATIONS_DIR` and `WEB_DIST`.

The `HEALTHCHECK` runs `pioneer-api health`, which calls `/api/health` on `PORT` and exits non-zero on failure,
since the runtime image has no `curl`. Podman ignores `HEALTHCHECK` unless the image is built with
`--format docker`.

Size, linux/amd64: about 110 MB uncompressed, of which 83 MB is the Bun binary.

## Without Compose

Run the image against any Postgres:

```sh
docker build -t pioneer .
docker run -p 8080:3000 -e DATABASE_URL=postgres://... --env-file .env pioneer
```

With more than one instance, set `MIGRATE_ON_START=false` on the servers and run the migrations once per deploy
with `docker run ... pioneer migrate` (see the ADR).
