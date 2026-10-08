# 0004. Characters store inputs; overrides are effects

- Status: Proposed
- Date: 2026-10-08

## Context

Pathbuilder's save format stores choices next to computed totals. Stored totals go stale when content or rules
change, and an edited total cannot explain itself. We need every value traceable, including manual changes.

## Decision

A character is a document of inputs: choice slot selections, inventory, play state, overrides and notes. No
derived value is persisted. Manual changes are overrides (adjust or set) compiled into rule elements with an
override origin carrying user, time and note, and appear in breakdowns like any other effect.

## Consequences

- Viewing any character requires the engine and its content; server-side views re-derive.
- Errata applies to existing characters automatically; invalidated choices are flagged, never deleted.
- The document is one zod-validated aggregate with a schema version and migrations on read.
