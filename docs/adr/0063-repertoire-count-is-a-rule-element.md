# 0063. Repertoire count is a rule element

- Status: Proposed
- Date: 2026-10-15

## Context

A spontaneous entry's repertoire has as many spells of a rank as it has slots of that rank (Player Core, Spell
Repertoire), and ADR-0047 and ADR-0062 size it that way. Three features break the rule at the 10th rank:

- A bard's Magnum Opus adds two common 10th-rank occult spells to the repertoire and gives a single 10th-rank slot.
  Perfect Encore adds a second slot and no spell.
- A sorcerer's Bloodline Paragon does the same with two common 10th-rank spells of the bloodline's tradition, and an
  oracle's Oracular Clarity with two common 10th-rank divine spells.
- The class tables already give each a single 10th-rank slot from 19th level, so the slot count was right and the
  repertoire was not: none of the three features had rules, and the repertoire was sized by that one slot.

An oracle's Divine Access is a different gap. It adds up to three cleric spells granted by a deity the player chooses
from the mystery's domains, of any rank the character can cast, "to your spell list, and to your spell repertoire as
soon as you can cast spells of the appropriate rank". Its ranks aren't fixed by the feature and its spells come from a
deity, not from a tradition's list.

Alternatives:

- **A repertoire size on `SpellSlots`.** The 10th-rank slot and the 10th-rank repertoire change on different features
  (Perfect Encore changes one and not the other), so one element per number keeps each feature's text and rules
  matching.
- **Granted spells for Magnum Opus.** `RepertoireSpells` names the spells; Magnum Opus lets the player pick them.
- **Hard-coding 10th rank as "two picks".** Nothing for homebrew, and content would no longer say what its features do.

## Decision

- A Pioneer element, `RepertoireCount { entry, rank, value }`, adds `value` repertoire spells of `rank` (1 to 10) to the
  spontaneous entry it names, apart from its slots, while its predicate holds. Those of every element in play for an
  entry add up per rank. One naming an entry not in play, or a prepared, innate or focus one, adds none.
  `spellcastingInPlay` gives each entry its `repertoireCounts`.
- A repertoire holds, at each rank below 10th, as many spells as the entry has slots of that rank plus its counts at
  that rank. At 10th rank slots never size it: it holds the entry's counts at 10th rank alone, and none without a
  count. So Magnum Opus is one `SpellSlots` element (one 10th-rank slot) and one `RepertoireCount` of two at the 10th
  rank; Perfect Encore is a second `SpellSlots` element and no count.
- A 10th-rank repertoire slot offers common spells of the entry's tradition at the 10th rank, access aside, never a
  lower spell heightened. `RepertoireSpells` still fills its first slot, as at any rank (ADR-0062).
- Signature spells are unchanged: they stop at 9th rank (ADR-0047), and the 10th-rank slot casts only its own spells.
- The importer adds a `RepertoireCount` of two at the 10th rank to Magnum Opus, Bloodline Paragon and Oracular Clarity,
  and a `SpellSlots` element alone to the feat that adds the second slot (Perfect Encore, Bloodline Perfection and
  Oracular Providence).
- Divine Access is not a rank-bound count and isn't part of this element. It needs a pick of a deity (a `ChoiceSet`),
  extra repertoire slots with no rank of their own (the pick's rank is the slot's), and options drawn from that
  deity's spells instead of a tradition. It is decided in a follow-up to this ADR when it is built (#599).

## Consequences

- Homebrew adds `RepertoireCount` to any feature that learns spells beyond its slots, at any rank.
- The sheet reads a 10th-rank repertoire slot like any other; only what it offers differs.
- The Foundry export (roadmap) writes no count; Foundry players add the spells by hand.
