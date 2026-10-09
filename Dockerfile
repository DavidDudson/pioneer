# syntax=docker/dockerfile:1
# One image: the compiled API serving the built web app on one origin (ADR-0011). See docs/deployment.md.

# Build on the runner's own platform: `bun build --compile` cross-compiles the API and the web app is
# platform-independent, so a multi-arch build needs no emulation.
FROM --platform=$BUILDPLATFORM docker.io/oven/bun:1.4.2@sha256:9114c058aeae42162ee16dd5084b95fe9473970bb6bcb5b232ab1630f0546895 AS build
WORKDIR /src
ENV NX_DAEMON=false NX_NO_CLOUD=true NX_SKIP_NX_CACHE=true

COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile

COPY . .
# Set by BuildKit for the platform being built; the default covers builders that do not set it.
ARG TARGETARCH=amd64
RUN case "$TARGETARCH" in \
      amd64) api_config=linux-x64 ;; \
      arm64) api_config=linux-arm64 ;; \
      *) echo "unsupported TARGETARCH: $TARGETARCH" >&2; exit 1 ;; \
    esac \
    && bunx nx run api:build:"$api_config" \
    && bunx nx run web:build:production

# glibc and libstdc++ only, which is all the compiled binary links; runs as uid 65532.
FROM gcr.io/distroless/cc-debian12:nonroot@sha256:9dac0a79194e45a7da0158a9c6da57b217585af0786db3845d1f0ec1a0dd182f
WORKDIR /app
COPY --from=build /src/dist/apps/api/pioneer-api ./pioneer-api
COPY --from=build /src/apps/api/migrations ./migrations
COPY --from=build /src/dist/apps/web/browser ./web

ENV PORT=3000 MIGRATIONS_DIR=/app/migrations WEB_DIST=/app/web
USER nonroot
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=6s --start-period=30s --retries=3 CMD ["/app/pioneer-api", "health"]
ENTRYPOINT ["/app/pioneer-api"]
