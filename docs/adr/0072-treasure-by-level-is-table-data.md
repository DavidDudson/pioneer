# 0072. Treasure by level is table data

- Status: Accepted
- Date: 2026-10-27

## Context

A generated character (Epic 13.1) needs gear worth what a character of its level would own. The core rules give this as
the Character Wealth table in GM Core: a lump sum for each level, permanent items and currency together.

## Decision

- `TreasureByLevel` is a list of 20 copper values, level 1 first. `CORE_TREASURE_BY_LEVEL` holds the core rules' lump
  sums, read from `treasure-by-level.json`; the numbers are data, not code. `generateGear` and `generateCharacter` take
  a table as an input and default to the core rules', as the limits of ADR-0064 do, so a table can set its own.
- `generateGear` funds the purse with the level's lump sum less what the character already owns, buys armour worn, a
  weapon and perhaps a shield in hand, and a few stowed items, then keeps at most 9,000 gp of what is left. Items and
  coins together never pass the level's sum.
- Items are common, no higher in level than the character, and bought near the top of the level they allow. Each one is
  used only as the content and the inventory limits allow, and a purchase that would leave the character encumbered is
  dropped. Coins are left out of that check: 1,000 coins weigh 1 Bulk, so the purse is capped instead.
- Choices come from the seed's `PickSource` (ADR for generated characters), so the same seed gives the same gear.

## Consequences

- The part of a high level's sum that gear and the capped purse don't hold is not represented: no gems or art objects
  are generated.
- Runes, precious materials and the lump-sum alternative to permanent items are not modelled; every item is baseline.
