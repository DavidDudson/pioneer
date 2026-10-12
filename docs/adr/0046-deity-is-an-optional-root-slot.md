# 0046. A deity is an optional root slot, and the sheet reads it from the server

- Status: Proposed; what a cleric's deity grants brought by [0047](0047-a-clerics-deity-grants-through-rule-elements.md)
- Date: 2026-10-12

## Context

Any character may worship a deity, and a cleric must (#469). Foundry pf2e gives every character one deity item, and
a cleric's Deity class feature carries a `ChoiceSet` of deities, predicated on the character having none yet, and a
`GrantItem` of the pick. The deity then sets roll options the cleric's other features read: Divine Font offers heal or
harm by `deity:primary:font:*`, and the sanctification choice offers holy or unholy by
`deity:primary:sanctification:*`. The sheet shows the deity's edicts and anathema, which are in its description, and
the browser's content bundles carry no descriptions yet (Epic 2.4).

Alternatives:

- **The cleric's `ChoiceSet` and `GrantItem`, as Foundry has them.** Only a cleric could pick a deity, and Foundry's
  `not: deity` predicate has no Pioneer form: a Pioneer roll option needs a namespace.
- **A required root slot**, like the class. Every fighter's Choices section would list an open deity.
- **The sheet loads deity descriptions itself.** No bundle carries descriptions yet, and Divine Mysteries's 415 deities
  are 2 MB of text, of which the sheet needs one.

## Decision

- `deity` is a root slot (ADR-0032) offering every deity entry. It is optional: empty, it is listed only while an
  option that needs it is set (`OPTIONAL_ROOT_SLOTS`), `feature:deity-cleric` for a cleric, so a fighter's Choices
  never mention it and a cleric's say it is open.
- A deity on the character sets, under `deity:primary`, what Foundry's `DeityPF2e.prepareActorData` sets from its data:
  each `font:<font>`, each `favored-weapon:<weapon>` and its sanctification (`sanctification:can:holy`, or
  `sanctification:none`), besides the `deity:primary:<slug>` its kind sets (`GrantEntry.characterOptions`).
- Player Core's Divine Font and Deity (Cleric) carry Foundry's divine font and sanctification `ChoiceSet`s, given by
  hand from the backlog (ADR-0031) without the cleric's deity `ChoiceSet` and `GrantItem`, which the root slot
  replaces, and without the sanctification choice's guard against itself.
- The importer keeps Divine Font's predicates on the deity's fonts, which ADR-0045 dropped until a character had a
  deity, so the font choice offers only the deity's.
- Cleric domains are a closed set, Foundry's config keys, so the sheet can name each with a message key.
- The server reads the sheet's deity (`CharacterSheet.deity`): the entry with its description and data, and each
  favoured weapon by the name of a loaded weapon of its base.

## Consequences

- A philosophy is on offer to a cleric too, though Foundry's cleric `ChoiceSet` leaves philosophies out; nothing flags
  it yet.
- The deity's divine skill and favoured weapon proficiency for a cleric, its spells on the cleric's list, its Strike
  with a fist and the holy or unholy trait stay in the backlog; [ADR-0047](0047-a-clerics-deity-grants-through-rule-elements.md)
  brings them.
- A champion's deity is needed by its Deity and Cause feature once Player Core 2 is imported; it joins
  `OPTIONAL_ROOT_SLOTS` then.
- A favoured weapon from a book not imported yet has no name; the sheet says it is not in the loaded content.
