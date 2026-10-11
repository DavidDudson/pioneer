# 0040. Spellcasting entries are rule elements

- Status: Proposed
- Date: 2026-10-11
- Amends: [0030](0030-statistics-derived-per-source.md) (the rank `@spellcasting.prof` reads)

## Context

A caster has one spellcasting entry per source (a class, a multiclass dedication, an innate spell), each with a
tradition, the attribute its spell attack and DC read, and whether its spells are prepared, spontaneous or innate
(#476). The engine already derives a spell attack and a spell DC per entry (ADR-0030); something has to say which
entries a character has.

Foundry pf2e has no rule element for this. A spellcasting entry is an item the player adds to the actor by hand, and
its rank is the actor's `spellcasting` proficiency. Player Core's spellcasting class features (Wizard Spellcasting),
witch patrons and multiclass dedications carry no rule elements that say a character casts, nor do the Expert, Master
and Legendary Spellcaster features that raise the rank.

Alternatives:

- **A `spellcasting` field on the class-feature and feat kinds.** A plain data field, but it holds no predicate, and
  innate entries come from heritages and ancestry feats too, so it would spread across kinds.
- **Entries in the character document**, picked in the builder as Foundry's player adds them. It stores what the
  rules derive from the build (ADR-0004), and a class change would leave a stale entry behind.
- **A rank per tradition**, as ADR-0030 had it and the legacy Core Rulebook worded it ("arcane spell attack rolls").
  It departs from the remaster, and a cloistered cleric with a wizard dedication would cast arcane spells a rank
  below divine ones.

## Decision

- A Pioneer rule element, `SpellcastingEntry { slug, tradition, attribute, preparation }` with the usual predicate,
  gives the character an entry while its predicate holds. Two in play with one slug are one entry, the first in play.
  Its slug names its statistics (`spell-attack:<slug>`, `spell-dc:<slug>`), so it is at most 64 characters.
- A character has one spellcasting rank, `spellcasting`, which every entry's spell attack and DC read
  (`@spellcasting.prof`), whatever its tradition. Player Core words every raise without a tradition ("Your proficiency
  ranks for spell attack modifiers and spell DCs increase to expert"), and Foundry keeps one `spellcasting` rank on
  the actor. This replaces ADR-0030's rank per tradition (`spellcasting:<tradition>`), which would leave a
  multiclass entry a rank behind the class's. An entry in play makes the character trained; a class's starting rank
  (Foundry's `spellcasting` field) does too, and further raises are ordinary `Proficiency` elements, the highest
  winning, as for every other rank.
- The importer adds entries and raises to Player Core's casters by entry slug, since Foundry records neither:
  - the bard, druid and wizard spellcasting features, raised by the shared Spellcaster features
    (`feature:expert-spellcaster`);
  - Cleric Spellcasting, raised by doctrine and level (nothing grants the doctrine-specific features: Foundry's
    generic Third Doctrine grants through an actor flag the importer does not translate);
  - each witch patron, in the patron's tradition, since Witch Spellcasting names none;
  - the bard, cleric, druid and wizard dedications, raised by their archetype's Expert and Master Spellcasting feats.

  A witch dedication's tradition is its patron's, which Foundry leaves to the player, so it is reported, not guessed.

## Consequences

- Entries come and go with the build: changing class or patron changes them, and nothing is stored.
- Homebrew and later books add casters with the same element; a book's casters are added with its import, or by hand
  in its pack (ADR-0031).
- Innate entries use the same element with `preparation: innate`; Player Core's innate ancestry feats are not filled
  in yet.
- This narrows ADR-0008: `SpellcastingEntry` has no Foundry counterpart, so the Foundry export (roadmap) turns each
  entry into a spellcasting entry item rather than a rule element.
