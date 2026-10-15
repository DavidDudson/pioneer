# 0061. Variant rules are enabled per campaign and per character, and read against the packs in force

- Status: Accepted
- Date: 2026-10-14

## Context

A variant rule is a content entry a pack defines (`variant-rule`, ADR-0026): rule elements the engine puts in play with
a `variant` origin hop, and, for a variant rule that needs more (a second class, extra feat slots), a declared
`structure`. Which variant rules are on for a character is a table-level choice: a GM turns them on for a campaign, and
a character outside campaigns turns them on for itself. A character in a campaign uses the campaign's and ignores its
own, as for packs (ADR-0060).

Two questions: how the enabled set is stored, and what happens to a choice whose pack is later switched off.

Storage options:

1. A `variants` column on `campaign_packs` / `character_packs`. Those rows are packs, not variant rules, and a variant
   rule does not belong to the one row of its pack.
2. A jsonb array on the campaign and the character. It has no unique constraint, no row for the audit log, and
   rewrites the aggregate for a toggle.
3. A table each, one row per enabled variant rule (chosen), like `campaign_packs` and `character_packs`.

Pack switched off:

1. Delete the variant rule's row when its pack goes. Two places would then need to know about each other (the pack
   services and the variant services), and switching a pack back on would silently lose the choice.
2. Leave the row and read it against the packs in force (chosen), as ADR-0060 does for a pack made private.

## Decision

- `campaign_variant_rules` and `character_variant_rules` hold one row per enabled variant rule: `(owner, variant_id)`
  unique, `enabled_by` set null with the user, `enabled_at`, audited. `variant_id` is the variant-rule entry's id and has
  **no foreign key**: the entry belongs to the rules context, and a pack leaving must not delete the choice.
- **The effective set is read, not stored**, and filtered against the registry: `CharacterContent#variantRules` and
  the variant services keep only the variant rules the registry of the packs in force holds. Official packs are always in
  force. A variant rule whose pack is off is left out of the list, of the derivation and of what can be disabled, and is
  back when its pack is.
- **A variant rule can be enabled only while a pack in force defines it**: a 404 otherwise. The campaign context asks a
  `VariantRuleCatalog` port, implemented in `apps/api` over the registry of the campaign's packs, since it may not
  import the rules context.
- A character in a campaign uses the campaign's set, through the same `AttachedCampaignPacks` port that gives the
  campaign's packs, and changing its own is a 409. Detaching brings its own rows back untouched.
- The GM changes a campaign's set (403 for a player, 404 for a non-member); only the owner reads or changes a
  character's (404 for anyone else).
- The engine takes the set as `StatisticSources.variants`, in play ahead of the character's items. The server derives
  with `CharacterContent#variantRules`; the sheet loads the same set from the API.
- `VariantRuleData` and `VariantRuleDefinition` declare `structure`, a closed set (`extraSlots`, `secondClass`). It
  carries no behaviour for `extraSlots` yet; `secondClass` adds the second class root slot
  (`characterRootSlots`, character-model.md, "Choice slots"), taken from the variants `slotContent` is given.

## Consequences

- Toggling a variant rule is one small row write, audited by name.
- A variant rule's pack going off and on again restores the choice, but while it is off the owner cannot see or remove
  the row. Revisit if that surprises anyone.
- Two services (character and campaign) hold near-identical logic over their own tables, as packs do, because the
  contexts may not share them.
