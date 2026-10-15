# 0062. Repertoire spells are a rule element

- Status: Proposed
- Date: 2026-10-15

## Context

A sorcerer's bloodline gives sorcerous gifts, a spell for each rank it names, and "when you gain a new rank of spells,
your first new spell is always the sorcerous gift spell for that rank listed in your bloodline, but you can choose the
other spells" (Player Core 2, Sorcerer). An oracle's mystery grants spells the same way. Foundry keeps them as text in
the bloodline's description: the repertoire is a spellcasting entry the player fills by hand, and the sorcerer's
tradition is a roll option on most bloodlines, an actor flag on the draconic one. Player Core 2's sorcerer and oracle
had no entry, no slots and no Signature Spells element, since Player Core's bard was the book's only spontaneous class
(ADR-0047).

Alternatives:

- **Granted spells on top of the repertoire.** #593 first read the gifts as extra spells beyond the slot table. The
  class says otherwise: the first spell of each new rank is the gift, so the repertoire stays as big as the slots, and
  the "slots and repertoire are separate" rule (a feat that adds a spell adds no slot) applies to feats, not here.
- **`GrantItem` of each spell.** A granted item is a thing the character has, not a spell it knows (ADR-0044).
- **Hard-coding bloodlines in the character domain.** Nothing for homebrew, and content would no longer say what its
  features do.

## Decision

- A Pioneer element, `RepertoireSpells { entry, spells: [{ rank, spell }] }`, gives the spontaneous entry it names
  those spells, each at a rank (a cantrip, or 1 to 10), while its predicate holds. Those of every element in play for an
  entry add up, each rank and spell once. One naming an entry not in play, or a prepared, innate or focus one, gives
  none. `spellcastingInPlay` gives each entry its `grantedSpells`.
- A granted spell fills the first repertoire slot of its rank, the next one when a rank names several, once the entry
  has slots of that rank. The slot reads as filled, offers that spell alone and refuses any other, whatever is stored
  for it (`PreparedSlot.granted`, and `granted` on the slot's subject in the character read). A gift for a rank with no
  slots yet is not in the repertoire.
- A granted spell is in the repertoire like any other, so it is offered for a signature slot of its rank, and a
  cantrip gift is no signature candidate. Gifts and signature spells need no code of their own.
- The sheet shows a granted slot as read-only text ("Fear, always known"). Another slot of the entry can't pick it
  again, as it can't pick any spell the repertoire holds.
- The importer adds, from Player Core 2's text, the sorcerer's entry on each bloodline (its tradition is the
  bloodline's), a draconic bloodline's exemplar and an elemental bloodline's influence as a `ChoiceSet` whose pick
  gates the entry and the extra gifts, the oracle's entry and both classes' slot tables (three slots of a rank, then
  four: a slot more than the bard's) and Signature Spells for both. Gifts name spells by slug and resolve to whichever
  official pack holds them.

## Consequences

- Later books' bloodlines and mysteries add their gifts the same way with their import; homebrew adds the element to
  any feature that grants repertoire spells. A feat that adds a spell without using a slot (Divine Access adds up to
  three cleric spells to an oracle's repertoire) needs a repertoire count apart from slots (#599), not this element.
- A draconic exemplar offers the four traditions' dragons Player Core 2 prints; the exemplars later books add join the
  `ChoiceSet`. The draconic bloodline's skill follows the exemplar, which Foundry keeps in the same actor flag; the
  importer adds it as a `Proficiency` per exemplar, held back when Crossblooded Evolution borrows the bloodline.
- The sorcerer's Bloodline Paragon and the oracle's Oracular Clarity give a 10th-rank slot that works differently,
  as Magnum Opus does for the bard (#599).
- The Foundry export (roadmap) writes no granted spell; Foundry players add the gifts by hand.
