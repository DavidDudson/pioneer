# 0067. Innate spells are a rule element

- Status: Proposed
- Date: 2026-10-17

## Context

A feat, heritage or ancestry feature can teach a character spells it casts innately, with the tradition's spell attack and
DC and no slot: Fey Influence's once-a-day spell, Grown of Oak's, Dream Magic's, and the spells of a dedication such as
Mortal Herald (Player Core, Innate Spells). ADR-0040 lets a feature give an innate `SpellcastingEntry`, but nothing said
which spells it casts: the entry had no slots, no repertoire and no element to hold them. An import from Pathbuilder
lists these casters by their feat's name (`innate: true`) with the spell and the rank it is cast at, and had nowhere to
put them.

Foundry keeps almost none of it: an innate entry is a spellcasting entry the player adds by hand, each spell an item
dragged into it. Fey Influence's feat carries `ActorTraits` and `Proficiency` elements and no spell; its heritage choice
is text.

Alternatives:

- **Report only.** Match the innate casters to their feat and list their spells in the import report. The spells are
  then nowhere on the character, and the sheet cannot show or cast them.
- **`GrantItem` of each spell.** A granted spell has no entry to cast from, and a granted item is a thing the character
  has, not a spell it knows (ADR-0044, ADR-0050).
- **Reuse `RepertoireSpells`.** It fills repertoire slots, and an innate entry has none; an innate spell takes no slot
  and no place in a repertoire.
- **A per-day count on the element.** Player Core says once per day and the importer would need to read it from the
  text; the play state has no per-day tracking of innate spells yet, so a count would restate text nothing reads.

## Decision

- A Pioneer element, `InnateSpells { entry, spells: [{ rank, spell }] }`, gives the innate entry it names those spells,
  each at the rank it is cast at (a cantrip, or 1 to 10), while its predicate holds. Those of every element in play for
  an entry add up, each rank and spell once. One naming an entry not in play, or one that isn't innate, gives none.
  `spellcastingInPlay` gives each entry its `innateSpells`.
- A cantrip is cast at half the level rounded up. The character domain reads the entry's spells with `characterInnate`;
  a spell whose content isn't loaded is left out, and an innate entry with no spells is kept so an open choice shows.
- A choice of innate spells is a `ChoiceSet` with `rollOption` and an `InnateSpells` per option gated on
  `<flag>:<option>`, as focus spells and a divine font's pool spells are (ADR-0050, ADR-0045). A feat whose entry slug
  is its own slug (`fey-influence`) lets the import attach an export's innate caster by the feat's name.
- The sheet lists innate spells under Spellcasting, by entry, with the rank each is cast at.
- A Pathbuilder import pairs each `innate` caster with the innate entry of the same name and picks the feature choice
  (an open `ChoiceSet` of the entry's own feature) whose option makes the entry grant what the export lists. Pathbuilder
  lists a heightened spell at the rank it is printed at, so an entry that casts the spell at that rank or higher matches.
  A listed spell the entry does not grant is a gap (`not-granted`); one whose feat the character lacks is `no-entry`.

## Consequences

- Later books and homebrew add innate spells the same way, from any feature that teaches them.
- Nothing tracks the casts used: a once-a-day innate spell is listed, not rationed. A per-day count belongs with the
  play state's other daily resources.
- The Foundry export (roadmap) writes no innate spell; Foundry players add them by hand.
