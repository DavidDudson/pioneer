# Architecture decision records

One file per decision that had a real alternative. Status is Proposed until the architecture PR merges, then
Accepted. To change a decision, add a new ADR that supersedes the old one; do not rewrite history.

| ADR                                                   | Decision                                                       |
| ----------------------------------------------------- | -------------------------------------------------------------- |
| [0001](0001-pure-shared-rules-engine.md)              | One pure rules engine, run in browser and server               |
| [0002](0002-three-valued-predicates.md)               | Three-valued predicates for conditional modifiers              |
| [0003](0003-content-as-data-imported-from-foundry.md) | Content as data in Postgres, imported from Foundry pf2e        |
| [0004](0004-store-inputs-not-derived-values.md)       | Characters store inputs; overrides are effects                 |
| [0005](0005-mandatory-source-references.md)           | Every content entry has a source reference                     |
| [0006](0006-campaign-event-log-and-live-sync.md)      | Campaign event log with WebSocket and LISTEN/NOTIFY            |
| [0007](0007-oauth-required-public-content.md)         | OAuth required for saving; Paizo content public via legal page |
| [0008](0008-rule-element-vocabulary.md)               | Foundry-aligned rule element semantics, typed schema           |
| [0009](0009-i18n-and-lazy-loading.md)                 | i18n: runtime locales, lazy messages and content text          |

Template:

```markdown
# NNNN. Title

- Status: Proposed | Accepted | Superseded by NNNN
- Date: YYYY-MM-DD

## Context

## Decision

## Consequences
```
