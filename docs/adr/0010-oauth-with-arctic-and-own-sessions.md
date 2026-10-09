# 0010. OAuth through Arctic; sessions owned by Pioneer

- Status: Proposed
- Date: 2026-10-09

## Context

ADR-0007 makes sign-in OAuth only (Discord, Google, GitHub) and left the library for Elysia to a spike in
milestone 3. The candidates were:

- **Better Auth**: a full auth framework with a Drizzle adapter, session handling and provider plugins. It owns its
  tables and naming, uses `Date` throughout (banned here in favour of Temporal), and its plugin model sits across
  our hexagonal layers rather than inside one adapter.
- **Arctic** (with Oslo): OAuth 2.0 and OIDC clients for each provider, plus state and PKCE helpers. No storage,
  no sessions, no framework coupling.

## Decision

- **Arctic for the provider flows only.** Each provider is an `OAuthProviderPort` adapter in
  `identity-infrastructure`. Every flow is authorization code with **PKCE (S256)** and a `state` nonce. Arctic's
  `GitHub` class has no PKCE, so the GitHub adapter uses Arctic's generic `OAuth2Client` against GitHub's
  endpoints (GitHub supports PKCE).
- **Sessions are ours.** `users`, `oauth_accounts` and `sessions` are Drizzle tables in the identity context, with
  branded ids, Temporal instants and audit triggers like every other table.
- **Session tokens.** 256 random bits, base64url, sent only as an `HttpOnly`, `SameSite=Lax` cookie (`Secure`
  whenever the public origin is https). The database stores only the SHA-256 of the token: a leaked table yields
  no usable cookie, and a 256-bit random token needs no slow hash. Sessions last 30 days; sliding renewal,
  revocation and CSRF checks for cookie-authenticated writes come with the session lifecycle story.
- **Login attempts** keep `state`, the PKCE verifier and the return path in 10-minute `HttpOnly` cookies. The
  callback clears them whatever the outcome. The return path must be a same-origin absolute path; anything else
  falls back to `/`, so sign-in is never an open redirect.
- **Accounts link by verified email.** A new provider account whose verified email matches an existing user's
  verified email joins that user (story #91). An unverified address never links.

## Consequences

- One small dependency (Arctic and three Oslo packages); everything stored follows the repo's domain rules.
- We own session security: token generation, hashing, expiry, cookie flags and CSRF. Each is covered by unit and
  route tests in `libs/identity`.
- Providers are configured by environment (`GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET`, `PUBLIC_ORIGIN`); a provider
  without credentials is simply off, so local development needs no OAuth app.
- Adding a provider is one adapter that maps its profile to `ProviderProfile`.
