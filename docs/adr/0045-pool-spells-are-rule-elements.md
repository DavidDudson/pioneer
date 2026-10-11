# 0045. The spells a pool of slots takes are a rule element

- Status: Proposed
- Date: 2026-10-12

## Context

Some features add spell slots kept apart from an entry's own, because only some spells go in them (ADR-0041): a
cleric's divine font takes _heal_ in a healing font or _harm_ in a harmful one, a wizard's curriculum takes the school's
curriculum spells, a cantrip and a slot of each rank. Preparing into them (#581) needs to know which spells each pool
takes. Foundry keeps none of it: a divine font is a spellcasting entry the player fills by hand, and a curriculum is a
table in the school's description. Which font a cleric has follows the deity, which Foundry's Divine Font `ChoiceSet`
reads (`deity:primary:font:heal`); Pioneer has no deity on a character yet (#469).

Alternatives:

- **A `spells` list on `SpellSlots`.** The font's and curriculum's slots are several elements each, one per level the
  count changes at, so the list would repeat on each, and the font's spell depends on a choice no count does.
- **A curriculum field on the school's kind data.** It fits a school but not a font, and a homebrew feature that adds
  a pool would need a field of its own.
- **Hard-coding each pool in the character domain** (`divine-font` takes heal or harm). Nothing for homebrew pools,
  and content would no longer say what its features do.
- **Keeping Foundry's deity predicates on the font choice.** Pioneer knows the `deity` namespace, so with no deity
  both fonts would read false and a cleric could fill no font slot until #469.

## Decision

- A Pioneer element, `PoolSpells { entry, pool, spells }`, names the spells a pool of an entry takes. Those of every
  element in play for one pool add up, each spell once; a pool with none takes nothing. Its `predicate` gates it like
  any element's, so a font's spell follows the font picked.
- `spellcastingInPlay` gives each pool its spells (`SlotPool.spells`).
- A pool's slots are prepared like the entry's own (ADR-0044): choice slots keyed
  `prepared:<entry>:<pool>:<cantrip|rank>:<n>`, after the entry's own, each offering the pool's spells that fit its
  rank, heightened. Tradition and rarity aside: the feature names the spells, so a curriculum's uncommon spells need no
  access listed.
- The importer translates Divine Font's `ChoiceSet` (flag `divine-font`, roll option `divine-font:<font>`) offering
  both fonts whatever the deity, and adds a `PoolSpells` per font gated on its roll option. Each school but Unified
  Magical Theory gets one `PoolSpells` listing its curriculum, cantrips then rank by rank, as its description's table
  does.

## Consequences

- Homebrew and later books add pools the same way: `SpellSlots` with a `pool` for the counts, `PoolSpells` for what
  goes in them.
- A cleric picks a font under Choices; until then the font slots offer nothing, and the sheet says to make the choice.
- Any cleric can pick either font until the deity lands (#469), which should narrow the font choice to the deity's.
- A curriculum spell can sit in both a curriculum slot and an own slot; nothing stops a wizard preparing it twice, as
  the rules allow.
- The Foundry export (roadmap) writes a pool's spells nowhere; Foundry players fill a divine font's entry by hand.
