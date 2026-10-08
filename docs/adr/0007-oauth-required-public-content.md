# 0007. OAuth required for saving; content browser public

- Status: Proposed
- Date: 2026-10-08

## Context

Campaigns, homebrew ownership and cross-device characters need identity. The Paizo Community Use Policy forbids
sign-up or email gates on Paizo material.

## Decision

Sign-in is OAuth only (Discord, Google, GitHub); no passwords or email accounts. An account is required to save
characters, author homebrew and join campaigns. The content browser and rules reference, including all rules
text, are public with no account.

## Consequences

- Every user-owned table has an owner and authorisation checks in application services.
- Risk: a builder that requires sign-in could be read as gating Paizo material. Mitigation: all Paizo content stays
  readable without an account. If that proves insufficient, add an unsaved "try the builder" mode or guest
  accounts, which this design allows without schema changes.
- Library choice for OAuth sessions on Elysia is a spike in milestone 3.
