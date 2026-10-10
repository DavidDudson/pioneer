# 0020. Local dev sign-in, kept out of production builds

- Status: Proposed
- Date: 2026-10-10

## Context

Signing in locally meant registering an OAuth app per workspace port (ADR-0007, ADR-0010), and testing anything
between a GM and players needed several real accounts. Issue #245 asks for seeded test users, a GM and two players,
that the sign-in page offers with one click. ADR-0007 makes sign-in OAuth only, so this is a carve-out. It is only
acceptable if none of it can reach a deployment: a session without a provider is an authentication bypass.

The alternatives considered:

- **An environment flag in `main.ts`** (`DEV_SIGN_IN=true`). This is one entrypoint, but the bypass would be compiled
  into the production binary, one misconfigured variable away from being live.
- **A fake OAuth provider** behind the existing login and callback routes. This reuses the flow, but it is still
  code in the binary, and it needs a fake authorisation server.
- **Seed only, sign in with real providers.** This is safe, but every developer needs OAuth apps and accounts for
  three people.
- **`isDevMode()` checks in the web app.** The bundler is not guaranteed to drop the guarded code, so the dev UI and
  its user ids could still ship.

## Decision

- **A separate API entrypoint.** `apps/api/src/main.dev.ts` is what `nx serve api` and `just db-reset` run. It
  migrates, seeds the dev users and their campaign (idempotent, fixed ids), and mounts `GET /api/auth/dev/:userId`
  through `createApp`'s extensions. `main.ts`, the input of the compiled binary, never imports it or
  `apps/api/src/dev`. The route starts a session with `IdentityService.startSession` for seeded ids only.
- **Local only, even in dev.** The dev server listens on loopback and refuses to start unless `PUBLIC_ORIGIN` is
  plain http on localhost. The route answers 403 to a request whose `Sec-Fetch-Site` is another site: the ids are
  public, so this stands in for the OAuth state check against login CSRF.
- **The web app swaps a file, not a flag.** The sign-in page renders `SIGN_IN_EXTRAS` (empty by default). Only the
  `development` build configuration replaces `apps/web/src/app/environment.ts` with `environment.development.ts`,
  which provides the dev sign-in component and its messages from `libs/identity/dev-sign-in`. A production build
  never imports that library.
- **The output is checked.** `verify-dev-free` (in `bun run check`) builds the production web app and the API
  binary and fails if either contains a dev marker: a seeded user id or name, the dev route, the component's
  selector or its message scope.

## Consequences

- `api:serve` runs `main.dev.ts`; the `migrate` and `health` commands stay in `main.ts` only.
- Dev-only code lives in `apps/api/src/dev`, `libs/identity/dev-users`, `libs/identity/dev-sign-in` and
  `apps/web/src/app/environment.development.ts`. New dev-only code there should add a marker to
  `tools/dev-markers.ts`.
- The dev users are ordinary rows, so a reseed leaves changes made through the app in place; `just db-reset` starts
  over.
- ADR-0007's OAuth-only rule still holds for every deployed build.
