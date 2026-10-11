# 0041. Spell slots are rule elements

- Status: Proposed
- Date: 2026-10-12

## Context

Each spellcasting entry (ADR-0040) has cantrips and spell slots per rank, from its class's table at the character's
level (#477). Some features add slots kept apart from the entry's own, because only some spells go in them: a cleric's
divine font (four slots at the highest rank for _heal_ or _harm_, five from 5th level, six from 15th), a wizard's
curriculum (an extra cantrip and an extra slot of each rank). A multiclass caster's slots come from the dedication (two
cantrips) and the archetype's Basic, Expert and Master Spellcasting feats, one slot of each rank as the levels come.

Foundry pf2e keeps no slot tables. A spellcasting entry's slots are numbers the player sets by hand; the tables are only
in the class features' text.

Alternatives:

- **A slot table on `SpellcastingEntry`**, twenty rows of cantrips and counts per rank. Compact for a class, but the
  divine font, the curriculum and the archetype feats add slots from other entries, so a second mechanism would still be
  needed for them.
- **Counts as formulas** (`ternary(gte(@actor.level, 6), 3, 2)`), one element per rank. Fewer elements, but slots would
  need the statistic resolver, which the entries, read from the effective set alone, do not.
- **A table per class in code.** Homebrew and later books could not add casters without code.

## Decision

- A Pioneer rule element, `SpellSlots { entry, rank, value, pool? }` with the usual predicate, adds `value` slots of
  `rank` (1 to 10), cantrips (`cantrip`), or slots at the entry's highest rank (`highest`) to the entry with slug
  `entry`. Without a `pool` they are the entry's own; with one they are kept apart in that pool.
- Counts add up per entry, pool and rank, so a table is a handful of elements gated by level: two slots of a rank from
  the level it opens at and one more from the next. One for an entry not in play adds nothing.
- `highest` is the highest rank below 10th that the entry's own slots reach, since Player Core's 10th-rank slots can't
  be used "with abilities that give you more spell slots".
- `spellcastingInPlay` gives each entry its own slots and its pools, each pool named by the entry whose element first
  added to it ("Divine Font").
- The importer adds them to Player Core's casters by entry slug, as it adds entries: the shared spells-per-day table on
  each caster's spellcasting feature (Witch Spellcasting for the entry the patron gives), Divine Font's pool, a
  curriculum pool on every school but Unified Magical Theory, and the dedications' and archetype feats' slots.

## Consequences

- Slots come and go with the build and the level; nothing is stored. Slots spent in play are play state (ADR-0022).
- Homebrew casters and later books' tables use the same element, as do features that add slots.
- The 10th-rank slot is on the class table at 19th level, where Player Core's tables show it, not on the class features
  (Miraculous Spell, Archwizard's Spellcraft) that grant it.
- Divine font is one pool whatever the deity's font; which spell goes in it waits on the font choice, which the importer
  does not translate yet.
- A witch dedication still has no entry (ADR-0040), so its archetype feats add no slots.
- This narrows ADR-0008 again: `SpellSlots` has no Foundry counterpart, so the Foundry export (roadmap) writes each
  entry's own counts as its spellcasting entry item's slot maximums, and each pool as a spellcasting entry item of its
  own, as Foundry players keep a divine font.
