# 0075. A ChoiceSet can pick an owned item, and rules reach the pick by `picked:<flag>`

- Status: Proposed
- Date: 2026-10-31

## Context

Foundry's `ChoiceSet` can offer the character's own items (`ownedItems: true`, `types: ["weapon"]`): "choose a weapon
you hold". 119 imported `ChoiceSet`s ask this, and nearly every one has readers that act on the picked item alone
(`DamageDice`, `FlatModifier`, `Note`, `ItemAlteration`, ...). Pioneer's `ChoiceQuery` offers content entries, and
the grants engine knows no inventory.

A Strike's rules are scoped by selector, not predicate: each weapon has a slug, unique among the character's
weapons, and its rolls answer to `<slug>-attack`, `<slug>-damage`, `strike:<slug>` and `strike-damage:<slug>`.
`ItemAlteration` is scoped by `items`, a predicate over an item's own roll options.

## Decision

1. **An owned query.** `ChoiceSet.choices` may be `{ ownedKinds, filter }`: the character's items of those kinds
   whose own roll options (under `item:`) satisfy `filter`. The grants context carries the character's items
   (`OwnedItem`: slug, name, kind, roll options); the caller builds them from the inventory.
2. **The pick is the item's slug**, the name a weapon's Strike already has, so it survives a reload and is the same
   string the engine scopes by.
3. **Rules reach the pick by `picked:<flag>`.** A weapon that is the pick of the slot with flag `F` also answers to the
   selectors `picked:F-attack` and `picked:F-damage`, and its own roll options include `picked:F`. The translator
   rewrites Foundry's `{item|flags.system.rulesSelections.F}-damage` to `picked:F-damage`, and an `ItemAlteration`
   aimed at the pick to `items: ["item:picked:F"]`.
4. **A lint keeps the link honest.** A translated rule that names `picked:F` must sit on an entry with a `ChoiceSet`
   of flag `F`; the importer refuses it otherwise, so a typo or a renamed flag cannot silently stop a rule applying.
5. **Where the engine reads it.** A weapon's `picked` flags join the selectors of its attack and damage rolls (`WeaponInputs.picked`),
   the `picked:<flag>-attack` and `-damage` domains of its Strike statistics (so `FlatModifier` reaches it too), and its
   own roll options for `ItemAlteration.items`. A flag shared with another `ChoiceSet` of the entry is ambiguous, so
   neither the owned `ChoiceSet` nor its readers are translated.
6. **Left for later.** Readers that need the picked item as a fact namespace (`item:id:{pick}` in `AdjustStrike`,
   `CriticalSpecialization`, `MartialProficiency`) stay in the backlog.

## Consequences

No rule element gains a field. The convention is a string, guarded by the lint. A pick naming an item the character
no longer holds is not offered, so the slot reads as open until the player picks again.
