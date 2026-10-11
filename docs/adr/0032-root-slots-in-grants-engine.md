# 0032. A character's own slots are root slots in the grants engine

- Status: Proposed
- Date: 2026-10-11

## Context

`selectSlot` (#417) must refuse a pick for a slot the character never has, or an option the slot doesn't offer, at
any level up to 20. The grants engine made slots only from `ChoiceSet`s on entries already on the character, and
took the character's direct entries as ready-made roots. The slots that put those entries there (ancestry, and
later heritage, background and class) existed nowhere, so nothing could say what `ancestry` offers.

Alternatives: check the character's own slots in the character service against the content registry, and use the
engine only for `ChoiceSet` slots (slot production split in two, which slot status on read (#419) and the pickers
(#27) would each have to merge); or a separate story before #417 for the engine change (the same design, one more
layer in the stack).

## Decision

- `GrantInputs.rootSlots` lists the slots the character has itself, each a key and a content kind. A root slot
  offers every entry of its kind, sorted by name, then id. A pick that is an entry of that kind answers it and is a
  root behind a `choice` hop; any other pick is an error and the slot is open, as for a `ChoiceSet` pick not on
  offer. `GrantResolution.rootSlots` reports each one with its offer and pick.
- Root slots read no facts, so they are read once, before the fixpoint, and the rounds are unchanged.
- Nothing grants a root slot, so it has no origin; its key names it. Root slots are reported apart from `open` and
  `answered`, which stay `ChoiceSet` slots with an origin.
- The character's root slots are `CHARACTER_ROOT_SLOTS` in the character domain (`ancestry` today).
  `grantLookup` reads the content registry as grants do (ancestries only, without rule elements, until packs move
  onto the envelope), so the server resolves a character's slots over loaded content.
- `slotRefusal` lives in the character domain, not the application layer, so the web builder can ask the same
  question the server answers.

## Consequences

- Heritage, background and class become root slots by adding a definition once their content kinds load; their
  picks then grant through the same walk as any other root.
- A consumer listing every outstanding choice reads open root slots (`pick` undefined) as well as `open`.
- `selectSlot` resolves the character's grants at each level from 20 down until the slot offers the pick: one
  resolution for a typical valid pick, twenty for a refusal.
