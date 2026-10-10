# 0007. OAuth required for saving; Paizo content public via legal page

- Status: Accepted
- Date: 2026-10-08

## Context

Campaigns, homebrew ownership and cross-device characters need identity. The Paizo Community Use Policy forbids
sign-up or email gates on Paizo material.

## Decision

Sign-in is OAuth only (Discord, Google, GitHub); no passwords or email accounts. An account is required to save
characters, author homebrew and join campaigns.

All Paizo material stays reachable without an account:

- The content browser and rules reference, including all rules text, are public.
- A public **Legal** page, linked from the footer of every page, holds the Paizo Community Use notice, ORC
  attribution, and a statement that all official content is derived from the
  [Foundry VTT pf2e system](https://github.com/foundryvtt/pf2e), linking the exact pinned release used.
- The same page lists the **content caches**: the generated official pack bundles, per pack and kind, with their
  Foundry release and content hash, downloadable without an account.

The account gates our own features (saving, homebrew, campaigns), never the content.

## Consequences

- Every user-owned table has an owner and authorisation checks in application services. Routes get the acting
  user from a `RequestAuthenticator` that identity implements and pass it to services, which treat another
  user's record as not found. An owner's foreign key to `users` is written in the migration, since a context's
  tables may not import identity's.
- The legal page is generated from pack manifests and `libs/rules/catalog/src/books.json`, so it cannot drift
  from what is served.
- Public cache downloads reuse the immutable, content-hashed bundles the browser already loads; no extra storage.
- OAuth library and session design: [ADR-0010](0010-oauth-with-arctic-and-own-sessions.md) (Arctic, own sessions).
