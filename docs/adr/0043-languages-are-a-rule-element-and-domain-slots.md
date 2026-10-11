# 0043. Languages are a rule element, their slots opened by the character domain

- Status: Proposed
- Date: 2026-10-11

## Context

A character knows the languages its ancestry grants, and picks more: the ancestry's `additionalLanguages.count` plus
the Intelligence modifier at 1st level, one more each time a boost raises Intelligence, and those feats and heritages
give (#470). Foundry pf2e writes a feat's languages as `subfeatures.languages` (`granted` slugs and a count of
`slots`), and extra slots as an `ActiveEffectLike` adding to `system.build.languages.max`, sometimes by formula:
Multilingual adds one more at master and one more at legendary in Society. Slots differ in what they offer: the
ancestry's and Intelligence's offer common languages and the ancestry's list, Multilingual's and Nomadic Halfling's
uncommon ones too. The sheet loads feats lazily (Player Core's are 1.3 MB), so it cannot read feat-granted languages
itself.

Alternatives:

- **A `languages` field on feat, heritage and class-feature data**, as Foundry's `subfeatures` is. Keeps the import
  one-to-one, but a data field has no predicate, so Multilingual's Society scaling would need its own field, and the
  same shape would be repeated on three kinds.
- **`ChoiceSet`s querying `language` entries**, opened by the grants engine. A `ChoiceSet` has no notion of what the
  character already knows, so a language granted later or picked earlier would still be offered.

## Decision

- A `Language` rule element, the Creature group's, grants languages (`grant`) and opens `slots` offering languages no
  rarer than `access` (common when absent) and the ancestry's list. Like every element it has a `predicate`, read over
  the character's roll options and its skill ranks at the level (`skill:society:rank:3`), so Multilingual's scaling is
  two predicated elements.
- The importer translates `subfeatures.languages` and a whole-number `ActiveEffectLike` on `system.build.languages.max`
  to it; Player Core's entries were given theirs by hand from the backlog (ADR-0031).
- The character domain opens language slots (`languageSlots`), as it does skill slots (ADR-0038):
  `language:<level>:<n>` for the ancestry and Intelligence, `language:<entry>:<rule>:<n>` for an element, from the
  lowest level its entry is on the character and its predicate holds. They are read in order, each over the languages
  known at its level and the picks before it, and listed and checked by `characterSlots` and `slotRefusal`.
- The server reads the sheet's languages (`CharacterSheet.languages`): what is known and from where, how many are left
  to add, and the next empty slot with its offers, so the sheet needs no feats loaded.

## Consequences

- A homebrew feat grants or opens languages with data, predicates included; a slot rule that isn't "up to a rarity,
  plus the ancestry's list" needs code.
- Element slots are keyed by rule index: editing an entry's rules can move a pick to another slot, where it reads as
  invalid or hidden until it is picked again.
- Reading language slots resolves the character's grants at every level from 1st to 20th, as an element's predicate
  can start holding at any of them. The resolutions are shared with skill slots per document (#571 tracks the cost).
- The importer sets no `access`: Foundry keeps no rarity on a slot, so an imported slot offers common languages until
  its rarity is set by hand, as Player Core's Multilingual and Nomadic Halfling were.
- An entry's slots open once however many times the character has it: a second Multilingual (taken again, or granted
  by Angelkin and taken too) opens none. Feat slots (#466) bring the second copy; keying slots per copy is a follow-up.
- Nomadic Halfling's extra language per Multilingual taken stays in the backlog.
- Wildsong and Aklo are campaign-exclusive homebrew, not official content: the import has no entry for them, and
  Wildsong's grants (the druid's Wildsong feature, Druid Dedication) leave the backlog. A campaign that uses them
  defines the languages and grants them with `Language` elements of its own.
