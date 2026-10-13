# Architecture decision records

One file per decision that had a real alternative. Status is Proposed until the architecture PR merges, then
Accepted. To change a decision, add a new ADR that supersedes the old one; do not rewrite history.

| ADR                                                           | Decision                                                                          |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [0001](0001-pure-shared-rules-engine.md)                      | One pure rules engine, run in browser and server                                  |
| [0002](0002-three-valued-predicates.md)                       | Three-valued predicates for conditional modifiers                                 |
| [0003](0003-content-as-data-imported-from-foundry.md)         | Content as data in Postgres, imported from Foundry pf2e                           |
| [0004](0004-store-inputs-not-derived-values.md)               | Characters store inputs; overrides are effects                                    |
| [0005](0005-mandatory-source-references.md)                   | Every content entry has a source reference                                        |
| [0006](0006-campaign-event-log-and-live-sync.md)              | Campaign event log with WebSocket and LISTEN/NOTIFY                               |
| [0007](0007-oauth-required-public-content.md)                 | OAuth required for saving; Paizo content public via legal page                    |
| [0008](0008-rule-element-vocabulary.md)                       | Foundry-aligned rule element semantics, typed schema                              |
| [0009](0009-i18n-and-lazy-loading.md)                         | i18n: runtime locales, lazy messages and content text                             |
| [0010](0010-oauth-with-arctic-and-own-sessions.md)            | OAuth through Arctic; sessions owned by Pioneer                                   |
| [0011](0011-api-binary-and-migrations.md)                     | One compiled API binary; migrations ship beside it                                |
| [0012](0012-container-image.md)                               | Distroless container image that checks its own health                             |
| [0013](0013-account-only-display-preferences.md)              | Display preferences belong to accounts; signed out is defaults                    |
| [0014](0014-formula-results-round-down.md)                    | Formula results are whole numbers, rounded down                                   |
| [0015](0015-production-host.md)                               | Production on AWS Lambda and Neon free tiers, in Sydney                           |
| [0016](0016-formula-reference-vocabulary.md)                  | Formula references use Pioneer's paths, translated from Foundry                   |
| [0017](0017-live-sync-over-server-sent-events.md)             | Live sync over Server-Sent Events, fanned out per stream                          |
| [0018](0018-foundry-is-the-live-play-surface.md)              | Foundry is the live play surface; Pioneer syncs to it                             |
| [0019](0019-rich-text-ast-rendered-in-rules-ui.md)            | Rich text is a document AST, rendered by `rules/ui`                               |
| [0020](0020-local-dev-sign-in.md)                             | Local dev sign-in, kept out of production builds                                  |
| [0021](0021-structured-spell-casting-fields.md)               | Spell casting fields are structured, parsed from Foundry text                     |
| [0022](0022-foundry-module-and-sync-model.md)                 | Foundry module: link tokens, polling and field ownership                          |
| [0023](0023-equipment-kinds-diverge-from-foundry-items.md)    | Equipment kinds diverge from Foundry's item types where the rules do              |
| [0024](0024-book-titles-are-message-keys.md)                  | Book titles are message keys; the registry holds published books                  |
| [0025](0025-feat-and-action-facet-fields.md)                  | Feats and actions store the skills, archetype and variable cost their facets read |
| [0026](0026-proficiency-bonus-table-is-content.md)            | The proficiency bonus table is content, replaced by a rule element                |
| [0027](0027-equipment-facet-units.md)                         | Equipment facets compare printed price in copper and Bulk in tenths               |
| [0028](0028-frontier-and-pioneer-components.md)               | Frontier knows no schemas; rules-aware UI is presentational or container          |
| [0029](0029-official-content-seeded-by-migrate.md)            | Official content is seeded by `migrate`, one hash-checked transaction per pack    |
| [0030](0030-statistics-derived-per-source.md)                 | Statistics derived per weapon and spellcasting entry                              |
| [0031](0031-official-packs-imported-once-from-foundry.md)     | Official packs are imported once from Foundry, then owned in the repo             |
| [0032](0032-root-slots-in-grants-engine.md)                   | A character's own slots are root slots in the grants engine                       |
| [0033](0033-foundry-vocabularies-imported-into-core-rules.md) | Foundry vocabularies are imported into core-rules                                 |
| [0034](0034-entry-slugs-name-their-kind.md)                   | Entry slugs name their kind (`ancestry:dwarf`)                                    |
| [0035](0035-character-reads-carry-slot-status.md)             | A character read carries its slots' statuses, worked out by the server            |
| [0036](0036-class-names-its-subclass-by-tag.md)               | A class names its subclass by the tag its options carry                           |
| [0037](0037-item-carry-stored-on-inventory-items.md)          | How an item is carried is stored on the inventory item                            |
| [0038](0038-skill-slots-come-from-class-data.md)              | Skill slots come from class data, opened by the character domain                  |
| [0039](0039-derived-conditions-are-grant-roots.md)            | Conditions the character's inputs bring are grant roots, not play state           |
| [0040](0040-spellcasting-entries-are-rule-elements.md)        | Spellcasting entries are rule elements                                            |
| [0041](0041-spell-slots-are-rule-elements.md)                 | Spell slots are rule elements                                                     |
| [0042](0042-etched-runes-stored-over-content.md)              | Etched runes are stored on the inventory item, over the content's                 |
| [0043](0043-languages-are-a-rule-element-and-domain-slots.md) | Languages are a rule element, their slots opened by the character domain          |
| [0044](0044-prepared-spells-are-choice-slots.md)              | Prepared spells are choice slots; spell access is in the build                    |
| [0045](0045-pool-spells-are-rule-elements.md)                 | The spells a pool of slots takes are a rule element                               |
| [0046](0046-deity-is-an-optional-root-slot.md)                | A deity is an optional root slot, and the sheet reads it from the server          |
| [0047](0047-signature-spells-are-rule-elements.md)            | Signature spells are a rule element                                               |
| [0048](0048-a-clerics-deity-grants-through-rule-elements.md)  | A cleric's deity grants through rule elements                                     |
| [0049](0049-spell-durations-the-text-gives-vary.md)           | A spell's duration may be left to its text, as `varies`                           |
| [0050](0050-focus-spells-are-rule-elements.md)                | Focus spells are a rule element, and the focus pool follows from them             |
| [0051](0051-spell-damage-reads-its-spellcasting-entry.md)     | A spell's damage may read the spellcasting entry that casts it                    |
| [0052](0052-character-scoped-display-preferences.md)          | Display preferences scoped to a character live beside it, per user                |
| [0053](0053-proficiency-selector-follows-a-choice.md)         | A `Proficiency` selector can follow a `ChoiceSet` pick                            |
| [0054](0054-pickers-are-tables.md)                            | Pickers are tables that open inline, searched, sorted and paged by the caller     |

Template:

```markdown
# NNNN. Title

- Status: Proposed | Accepted | Superseded by NNNN
- Date: YYYY-MM-DD

## Context

## Decision

## Consequences
```
