# 0048. Focus spells are a rule element, and the focus pool follows from them

- Status: Proposed
- Date: 2026-10-12

## Context

A character with focus spells casts them for Focus Points from a focus pool, heightened to half its level rounded up,
with the spell attack and DC of the class's tradition (Player Core, Focus Spells). Features and feats grant them: a
bard's Composition Spells, a cleric's Domain Initiate, a druid's order, a ranger's warden feats, a witch's patron,
hexes and lessons, a wizard's school. Some are focus cantrips, which cost no point. The pool holds one Focus Point per
focus spell, at most 3 (Domain Initiate: "Your focus pool can hold one Focus Point for each focus spell you have, up to
3 points").

Foundry keeps almost none of it: a focus entry is a spellcasting entry the player adds by hand, each focus spell an
item dragged into it, and the pool's maximum a number the player sets. Domain Initiate's `ChoiceSet` picks a domain
from `system.details.deities.domains`, which grants nothing; which spell a domain grants is only in the domains
journal. The play state's focus points (#345) need the pool's maximum, worked out from the character's focus spells.

Alternatives:

- **`GrantItem` of each spell.** A spell granted onto the character has no entry to cast from, and a granted item is a
  thing the character has, not a spell it knows; prepared and repertoire spells are choice slots for the same reason
  (ADR-0044).
- **A `points` field on the element** for the Focus Points it adds. Player Core counts the spells, so `points` would
  restate what the spells already say, and a cantrip's 0 or a spell granted twice would be the content's to get right.
- **Hard-coding focus spells per class feature** in the character domain. Nothing for homebrew, and content would no
  longer say what its features do.

## Decision

- `SpellPreparation` gains `focus`. A focus entry is a `SpellcastingEntry` like any other, with its own spell attack
  and DC, and no slots.
- A Pioneer element, `FocusSpells { entry, spells }`, gives the focus entry it names those spells while its predicate
  holds. Those of every element in play for an entry add up, each spell once. One naming an entry not in play, or one
  that isn't a focus entry, gives none. `spellcastingInPlay` gives each entry its `focusSpells`.
- The character domain works out the focus pool from the spells (`characterFocus`): one Focus Point per distinct
  focus spell that isn't a cantrip, across the character's focus entries, at most 3 (`FocusPoints`). A spell whose
  content isn't loaded counts for nothing, since its traits can't be read. Every focus spell, focus cantrips included,
  is cast at half the level rounded up.
- A choice of focus spells is a `ChoiceSet` with `rollOption` and a `FocusSpells` per option gated on
  `<flag>:<option>`, as a divine font's pool spells are (ADR-0045). Domain Initiate offers the deity's primary and
  alternate domains, which a deity now sets as roll options (`deity:primary:domain:fire`,
  `deity:primary:alternate-domain:sun`). Advanced Domain offers the domains Domain Initiate picked.
- The importer adds focus entries, choices and `FocusSpells` for Player Core's class features and feats from their
  text, and the domains' spells from Foundry's domains journal (`domain-spells.ts`); Foundry's own Domain Initiate
  `ChoiceSet` is dropped as before.
- The sheet picks a `ChoiceSet` that lists its options in Choices (#596), so a domain, warden spell or hex is picked
  there. Focus spells are listed under Spellcasting with the pool and the rank they are cast at.

## Consequences

- Later books, archetypes (#606) and homebrew add focus spells the same way; a feature that adds a Focus Point without
  a spell (a later book's) would need its own element.
- An order's focus entry and order spell hold unless the order was joined through Order Explorer
  (`not feat:order-explorer:<order>`), which grants none of its other benefits, as Foundry guards an order's own.
- Order Magic offers nothing until Order Explorer's choice imports (#604), and a feat taken twice shares its first
  take's choice, so a second Domain Initiate or Initiate Warden picks nothing new (#605).
- Lesson features carry their hexes, but Basic, Greater and Major Lesson import with no rules, so no lesson reaches a
  witch yet.
- Feats can't be picked on the sheet until #466, so feat-granted focus spells are reachable only through the API.
- Domains whose spells only later books print offer no Domain Initiate option until those books import.
- The Foundry export (roadmap) writes no focus entry; Foundry players add their focus spells by hand.
