# 0037. How an item is carried is stored on the inventory item

- Status: Proposed
- Date: 2026-10-11

## Context

Wield, wear and invest (#472) need somewhere to keep how each item is carried (worn, held in one or two hands,
stowed, dropped) and whether it is invested. The character model sketched two places: a field on each
`InventoryItem`, and a `play.wielding` map of hands to items. [ADR-0022](0022-foundry-module-and-sync-model.md) already
decides who owns this state: each item's equipped state is a play-state field, left out of a build update and
written per sync mode. It does not say where the document keeps it.

## Decision

- Each `InventoryItem` has `carry` (`worn`, `held` with `hands`, `stowed` by default, `dropped`) and `invested`
  (schema version 3). `play.wielding` is dropped from the model.
- Ownership stays as ADR-0022 has it: these are play-state fields. A build re-sync leaves them out; in `foundry`
  mode the play snapshot writes them on the items it matches by `itemKey`; in `pioneer` mode the sheet's
  `carryItem` and `investItem` edits own them.
- The document enforces what holds whatever the source: an item inside a container is stowed, no more than two
  hands are in use and no more than 10 items are invested.

## Alternatives

- **`play.wielding` beside the inventory.** Hands would live apart from the items they hold, and worn and invested
  would need two more maps keyed by item id. Removing or moving an item would have to clean up three places, and an
  item could be held in a map after it left the inventory.

## Consequences

- One item carries everything about it, as Foundry pf2e's `system.equipped` does, so import (#310) and export
  (#212) map it field for field.
- The play snapshot endpoint (#220) writes into `inventory.items`, not only `play`, so its schema check covers the
  inventory's limits too.
- Daily preparations (re-investing) edit items, not a separate resource.
