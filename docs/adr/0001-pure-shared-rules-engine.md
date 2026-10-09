# 0001. One pure rules engine, run in browser and server

- Status: Proposed
- Date: 2026-10-08

## Context

The builder must feel instant: every choice re-derives the sheet. Campaigns need the server to see the same
numbers players see, for party views, GM tools, validation and export. Two implementations would drift.

## Decision

`libs/rules/engine` is pure TypeScript with no I/O, clock or randomness, depending only on `shared/kernel`,
`rules/sdk` and `rules/formula`. The browser and the Bun server both run it. Derivation is a function of character
document, content registry, variant rules and optional situation, and returns values with full breakdowns.

## Consequences

- Content must be available in the browser; packs ship as cached, content-hashed bundles split by kind.
- Engine performance is a product requirement (target: under 10 ms for a level 20 character).
- The server never trusts client-computed numbers; it re-derives when it needs them.
- Golden and property tests run once, cover both hosts.
