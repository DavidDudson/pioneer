# Architecture decision records

One file per decision that had a real alternative. Status is Proposed until the architecture PR merges, then
Accepted. To change a decision, add a new ADR that supersedes the old one; do not rewrite history.

| ADR                                                   | Decision                                                        |
| ----------------------------------------------------- | --------------------------------------------------------------- |
| [0001](0001-pure-shared-rules-engine.md)              | One pure rules engine, run in browser and server                |
| [0002](0002-three-valued-predicates.md)               | Three-valued predicates for conditional modifiers               |
| [0003](0003-content-as-data-imported-from-foundry.md) | Content as data in Postgres, imported from Foundry pf2e         |
| [0004](0004-store-inputs-not-derived-values.md)       | Characters store inputs; overrides are effects                  |
| [0005](0005-mandatory-source-references.md)           | Every content entry has a source reference                      |
| [0006](0006-campaign-event-log-and-live-sync.md)      | Campaign event log with WebSocket and LISTEN/NOTIFY             |
| [0007](0007-oauth-required-public-content.md)         | OAuth required for saving; Paizo content public via legal page  |
| [0008](0008-rule-element-vocabulary.md)               | Foundry-aligned rule element semantics, typed schema            |
| [0009](0009-i18n-and-lazy-loading.md)                 | i18n: runtime locales, lazy messages and content text           |
| [0010](0010-oauth-with-arctic-and-own-sessions.md)    | OAuth through Arctic; sessions owned by Pioneer                 |
| [0011](0011-api-binary-and-migrations.md)             | One compiled API binary; migrations ship beside it              |
| [0012](0012-container-image.md)                       | Distroless container image that checks its own health           |
| [0013](0013-account-only-display-preferences.md)      | Display preferences belong to accounts; signed out is defaults  |
| [0014](0014-formula-results-round-down.md)            | Formula results are whole numbers, rounded down                 |
| [0015](0015-production-host.md)                       | Production on AWS Lambda and Neon free tiers, in Sydney         |
| [0016](0016-formula-reference-vocabulary.md)          | Formula references use Pioneer's paths, translated from Foundry |
| [0017](0017-live-sync-over-server-sent-events.md)     | Live sync over Server-Sent Events, fanned out per stream        |
| [0018](0018-foundry-is-the-live-play-surface.md)      | Foundry is the live play surface; Pioneer syncs to it           |
| [0019](0019-rich-text-ast-rendered-in-rules-ui.md)    | Rich text is a document AST, rendered by `rules/ui`             |

Template:

```markdown
# NNNN. Title

- Status: Proposed | Accepted | Superseded by NNNN
- Date: YYYY-MM-DD

## Context

## Decision

## Consequences
```
