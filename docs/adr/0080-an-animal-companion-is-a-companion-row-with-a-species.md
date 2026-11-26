# 0080. An animal companion is a companion row with a species

- Status: Proposed
- Date: 2026-11-26

## Context

[ADR-0079](0079-a-familiar-is-a-companion-row-with-derived-statistics.md) models the familiar as a `character_companions`
row and says M23 confirms an `animal-companion` variant rather than deciding a model. The rules are compiled in
[animal-companions.md](../architecture/animal-companions.md) (spike
[#2127](https://github.com/DavidDudson/pioneer/issues/2127)). What differs from a familiar:

- A companion is built from a species (bear, wolf, horse) whose stat block is content, and a tier that rises with feats.
  A familiar derives everything from the master's level.
- A character can hold several (Beastmaster, Additional Companion: at most four), with one active.
- It can die and be replaced after a week of downtime, and it can be a mount.

Alternatives:

- **A separate table.** Duplicates the archive, audit, restore, play state and "has an active companion of kind X"
  predicate that ADR-0079 built for exactly this.
- **Species as columns.** Every later kind (eidolon, special companions) would add nullable columns.
- **One row per kind, `form` typed per kind** (chosen).

## Decision

1. **Same table, `kind = 'animal-companion'`.** `CompanionKind` gains `AnimalCompanion`. `Companion` becomes a
   discriminated union on `kind`: the familiar keeps its open `form`; the animal companion's `form` is
   `{ species: ContentId }`, the id of a companion-kind content entry
   ([#2139](https://github.com/DavidDudson/pioneer/issues/2139)). The domain only checks the shape; the engine resolves
   the species against the registry and reports an unknown one as a problem, so a pack that later disappears does not
   break the load. "Kind" in the stories' wording (bear, wolf) is the `species`; `kind` stays the companion kind.
2. **What persists** is in the table below. Hit points, AC, saves, Perception, skills, attacks and damage are
   derived, as for the familiar.
3. **Several companions.** The one-live-per-kind index of ADR-0079 becomes partial on `kind = 'familiar'`, in the
   migration of [#2134](https://github.com/DavidDudson/pioneer/issues/2134). A character holds at most four live animal
   companions, which the API enforces (409). More than one needs Beastmaster; the database cannot see feats, so that is
   an engine problem on the build, not a constraint. Exactly one live companion has `status` `active`; Call Companion
   swaps it in play (1 minute) and another companion is `absent`. A restore is refused while four are live.
4. **A mount is the same row.** A rider is play state and the restrictions are conditional modifiers
   (animal-companions.md section 3). No second creature, no second row ([#2131](https://github.com/DavidDudson/pioneer/issues/2131)).
5. **Archive.** As ADR-0079: replacement (after the downtime week) archives with `replaced`, a release with `released`,
   both in one transaction with any new row. Death is `status`, not an archive.
6. **Brands and sets.** `CompanionKind.AnimalCompanion` in `libs/rules/sdk`. In `libs/rules/sdk` too, because stat
   blocks and feats name them: `CompanionTier` (`young`, `mature`, `nimble`, `savage`, `specialized`) and
   `CompanionSpecialization` (`ambusher`, `bully`, `daredevil`, `racer`, `tracker`, `wrecker`), const objects with
   their `z.enum` schemas. `CompanionId`, `CompanionName`, `CompanionArchiveReason` and `CompanionStatus` stay in
   `libs/character/domain` as ADR-0079 set. The species is a `ContentId`; no new brand.

### What persists

| Fact                                  | Where                                             | Why                                                                                               |
| ------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Kind, name, species, granting slot    | Row (build)                                       | Identity the owner chose                                                                          |
| Tier (young to specialized)           | Derived from the feats the master holds           | ADR-0004; removing a feat lowers it ([#2138](https://github.com/DavidDudson/pioneer/issues/2138)) |
| Nimble or savage, specialization      | Choice slots `companion:<id>:tier:<n>`            | Build picks, per companion for the Beastmaster (ADR-0044)                                         |
| Damage, temp HP, conditions, `status` | `PlayState.companions[id]` (ADR-0079)             | Play state; never bumps `characters.version`                                                      |
| Barding and other worn items          | The master's inventory, marked with the companion | One inventory; wearing is the item's state (later story)                                          |
| Dead, absent                          | `status`                                          | A death is replaced by downtime, not deleted (ADR-0062)                                           |

## Consequences

- [#2134](https://github.com/DavidDudson/pioneer/issues/2134) adds the variant, the cap and the index migration on top of
  [#2049](https://github.com/DavidDudson/pioneer/issues/2049).
- [#2135](https://github.com/DavidDudson/pioneer/issues/2135) takes the tier as an input and defines the stat block it
  reads in `libs/rules/sdk`; [#2139](https://github.com/DavidDudson/pioneer/issues/2139) fills it with content.
  [#2138](https://github.com/DavidDudson/pioneer/issues/2138) derives the tier.
- The Beastmaster feats, Call Companion and the cap of four are rules the engine checks later
  ([#2137](https://github.com/DavidDudson/pioneer/issues/2137) and the lifecycle stories).
- Familiar behaviour does not change.
