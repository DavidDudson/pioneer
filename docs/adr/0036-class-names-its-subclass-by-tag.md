# 0036. A class names its subclass by the tag its options carry

- Status: Proposed
- Date: 2026-10-11

## Context

The builder shows a class's subclass (a cleric's doctrine, a wizard's arcane school, a druid's order) in the build
summary and picks it beside the class (#463). Foundry pf2e writes every Player Core subclass the same way: a class
feature (Doctrine) holds a `ChoiceSet` filtering class features by tag (`item:tag:cleric-doctrine`) and a
`GrantItem` of the pick, and each option carries the tag in `otherTags`. Nothing marks that choice as the subclass,
and a class can have more than one such query: the wizard's Arcane School and Arcane Thesis both filter by tag.

Alternatives:

- **The first tag query among the class's 1st-level features.** No new field, but it depends on the order of the
  class's grants, and it picks right for the wizard only because Arcane School sorts before Arcane Thesis.
- **A marker on the `ChoiceSet`** (a `subclass: true` field). Exact, but it adds a Pioneer-only field to a rule
  element that otherwise keeps Foundry's schema (ADR-0008), on the feature rather than the class it describes.
- **A reference from the class to its subclass feature's `ContentId`.** Exact, but it names the feature, not the
  choice, so the builder would still have to find the feature's `ChoiceSet`, and a homebrew class that offers its
  subclass through a feat would have no feature to point at.

## Decision

- `ClassData.subclass` is the tag the class's subclass options carry (`cleric-doctrine`). The subclass slot is the
  `ChoiceSet` on the character that queries class features with `item:tag:<subclass>`. A class without a subclass
  (fighter) leaves it out.
- `ClassFeatureData.tags` keeps Foundry's `otherTags`; each is the roll option `tag:<tag>` a query reads under
  `item:`.
- The importer translates Foundry's subclass pattern (a filter of `item:tag:` terms with a `GrantItem` of the pick's
  `rulesSelections` flag) into a class-feature query and a grant of `{ choice }`, and names `subclass` for Player
  Core's classes, since Foundry marks it nowhere.

## Consequences

- One data field picks the subclass, whatever order the class grants its features in.
- Classes from later books get `subclass` with their import, or by hand in their pack (ADR-0031); until then they
  read as having none, and the build summary asks for no subclass.
- A homebrew class names its subclass the same way: tag its options and set `subclass`.
