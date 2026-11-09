# 0078. A rune that raises potency takes no property rune slot

- Status: Proposed
- Date: 2026-11-09

## Context

An item holds as many property runes as its potency grade (ADR-0064). A mythic potency rune raises the item's potency
to +4 and so makes room for a fourth property rune, but it is itself a property rune. Counting it against the room it
makes would leave a +3 item with three other runes, which is not what the rune says.

The potency an item has is read from its runes, before any rule is in play, because which property runes work depends
on it and the rules in play come from the runes that work. A rule element that changed potency could not be read from
the rules in play without going round in a circle.

## Decision

- A rune raises potency with an `ItemAlteration` of the `potency` property that is `etched`: it reaches only the
  inventory item the rune is etched onto. A rune whose rules hold one with no `predicate` (`raisesPotency`) takes no
  slot.
- The item's potency is read in two steps in `libs/character/domain` (`itemPotency`): the potency rune's grade, then the
  potency elements of every etched rune that raises it, applied by the numeric rules of `alterItem` (`potencyAfter`).
  Room is that potency times the limit per grade, and only the runes that take a slot count against it
  (`slottedRunes`, `workingEtchedRunes`).
- The same element, read again from the rules in play, gives the weapon's attack bonus and the armour's AC bonus: both
  read the altered `potency` number (`potencyOf`), held to +4.
- An element with a `predicate` never frees a slot, as it would make the room depend on the situation.

## Consequences

- A mythic potency rune upgrades potency to +4 whether or not a potency rune is etched, and the item holds four
  other property runes.
- Room, refusal and the rule check all take the content's runes (`RuneReader`), so a caller that lacks them cannot ask.
- Foundry's translators cannot export a `potency` alteration or `etched`; they stay hand-written in the pack.
