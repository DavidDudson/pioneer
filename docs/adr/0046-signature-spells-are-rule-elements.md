# 0046. Signature spells are a rule element

- Status: Proposed
- Date: 2026-10-12

## Context

A spontaneous caster casts from a repertoire (#479): the spells it knows, as many of each rank as it has slots of that
rank (Player Core, Spell Repertoire). A spell is known only at the rank it was learned, so casting it heightened needs
it learned again at the higher rank. Signature Spells, a class feature every spontaneous class gets at 3rd level, lets
the caster pick one known spell of each rank to heighten freely instead. Foundry keeps neither: the repertoire is a
spellcasting entry the player fills by hand, and a signature spell is a flag on the spell item. The feature has no rule
elements, and one feature is shared by the bard, oracle, sorcerer, psychic and summoner.

Alternatives:

- **Hard-coding the feature's slug** in the character domain. Nothing for homebrew or an archetype that grants signature
  spells, and content would no longer say what its features do.
- **A `signature` flag on `SpellcastingEntry`.** The bard's entry exists from 1st level and its dedication's entry has
  the same slug, but only the class gets signature spells, and only from 3rd level.

## Decision

- A Pioneer element, `SignatureSpells { entry }`, gives the spontaneous entry it names signature spells while its
  predicate holds. One naming an entry not in play, or a prepared or innate one, gives none.
  `spellcastingInPlay` marks each entry (`signatures`).
- A spontaneous entry's repertoire is choice slots keyed `repertoire:<entry>:<cantrip|rank>:<n>`, as many of each rank
  as its slots, read like prepared slots (ADR-0044): its tradition's spells of that rank or lower, learned heightened,
  uncommon ones once the build lists access.
- An entry with signature spells has a choice slot per rank of its slots, `signature:<entry>:<rank>`, offering the
  spells its repertoire knows at that rank. Its pick is cast at every rank from its own up to the entry's highest
  below 10th (`castRanks`), since a 10th-rank slot casts only Magnum Opus's spells; any other repertoire spell only
  at the rank it was learned.
- The importer gives Player Core's Signature Spells a `SignatureSpells` naming the bard's entry, the book's only
  spontaneous class. The shared feature names each class's entry; one not in play adds nothing.

## Consequences

- Later books' spontaneous classes add their entry to Signature Spells with their import (#593), and homebrew adds the
  element wherever its feature grants signature spells.
- A bard dedication's entry has a repertoire but no signature spells until an archetype element says otherwise (#595).
- A repertoire is as big as the entry's slots at every rank, so Magnum Opus's two 10th-rank spells for one slot need
  a repertoire count apart from slots (#599).
- Repertoire picks are freely editable, like prepared ones; the one swap a level allows is not enforced yet (#594).
- The Foundry export (roadmap) writes no signature flag; Foundry players mark them by hand.
