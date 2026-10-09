# 0012. Distroless container image that checks its own health

- Status: Proposed
- Date: 2026-10-09

## Context

Epic 10.1 ships Pioneer as one image: the compiled `pioneer-api` binary serving the API and the built web app,
with migrations beside it ([ADR-0011](0011-api-binary-and-migrations.md)). The image needs a `HEALTHCHECK`
against `/api/health`, a non-root user, and as little else as possible. The binary is a glibc executable that links
only glibc and libstdc++.

The alternatives considered for the runtime stage:

- **`debian:bookworm-slim` plus `curl`.** A familiar base with a shell for debugging, and `curl` makes the
  healthcheck a one-liner. It adds a package manager, a shell and `curl` to every image, and their CVEs with them,
  for one HTTP request every 30 seconds.
- **`oven/bun:slim`, probing with `bun -e 'fetch(...)'`.** No extra package, but the image then carries a second
  Bun runtime next to the one compiled into the binary.
- **Alpine.** Small, but musl: the binary would need the `bun-linux-*-musl` targets and a second build matrix.

## Decision

- **The runtime stage is `gcr.io/distroless/cc-debian12:nonroot`**: glibc, libstdc++, CA certificates and a
  `nonroot` user (uid 65532), no shell or package manager. It is pinned by digest.
- **The binary checks its own health.** `pioneer-api health` calls `/api/health` on `PORT` and exits non-zero with
  one line on failure; the `HEALTHCHECK` runs it in exec form. It validates only `PORT`.

## Consequences

- No shell in the image: debugging uses `docker cp`, a debug sidecar, or the `:debug-nonroot` distroless variant
  built locally. `docker exec ... sh` does not work.
- The healthcheck is tested with the binary (`apps/api/src/binary.db.test.ts`), not only in a container.
- Podman ignores `HEALTHCHECK` in OCI-format images; build with `--format docker` there.
- The `Dockerfile` and `compose.yaml` are described in [Deployment](../deployment.md).
