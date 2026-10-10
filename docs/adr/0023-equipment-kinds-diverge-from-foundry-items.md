# 0023. Equipment kinds diverge from Foundry's item types where the rules do

- Status: Proposed
- Date: 2026-10-10

## Context

Story #232 gives equipment its `data` schemas, the importer's target for Epic 2.5. Foundry pf2e's physical item
types don't line up one to one with the kinds the story names. A rune is an `equipment` item with an
`etched-onto-…` usage, and what a property rune does lives in the system's code (`RUNE_DATA`), not in the item.
Ammunition is its own `ammo` type and containers are `backpack` items, neither among the story's kinds. Armour
stores check and speed penalties as negative numbers. Mirroring each Foundry type and sign was the alternative.

## Decision

- `rune` is its own kind, `fundamental` or `property`, with what it is `etchedOnto`. What a property rune does is
  its `rules`.
- Foundry's `ammo` items are `consumable` entries with the `ammunition` category and the kinds they can be fired
  as. Its `backpack` items are `equipment` with a `container`.
- Penalties are stored as their size: `checkPenalty` 1 is -1, `speedPenalty` 5 is -5 feet.

See [content-model.md](../architecture/content-model.md#equipment-data).

## Consequences

- The builder and sheet find runes by kind, and check fundamental runes against the items they go on, without reading
  usage strings.
- The importer can't take property-rune `rules` from Foundry's items, because Foundry keeps them in code. They are
  translated from that code or written by hand, and the coverage report lists runes without them.
- The importer maps `etched-onto-…` equipment to `rune`, `ammo` to `consumable` and `backpack` to `equipment`, and
  negates penalties. The Foundry export (ADR-0018) maps them back.
- Two fewer kinds to register, render and translate.
