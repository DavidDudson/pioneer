# 0079. A familiar is a companion row whose statistics are derived

- Status: Proposed
- Date: 2026-11-14

## Context

A character can have a familiar, and later an animal companion, an eidolon or another creature that follows it.
Pioneer has none of these: no table, no domain type, no builder step. Only the content exists (the 50 familiar
abilities are `action` entries with `category: familiar`), `TargetKind.Familiar` names one as a spell target, and
Pathbuilder's `familiars` array is parsed and never read.

The character is one jsonb `document` (the build and the inventory), and its play state sits in `character_play` with its
own revision ([ADR-0022](0022-foundry-module-and-sync-model.md)). The only precedent for a second stored entity is the
party stash ([ADR-0076](0076-the-party-inventory-is-one-flat-container-that-adds-no-bulk.md)), a row with its own
version.

Alternatives:

- **In the document.** A `build.companions[]` array saves and versions with the build and needs no new table. But a
  replaced or dead familiar would be an array entry with a flag, so "archived, never deleted"
  ([ADR-0062](0062-user-content-is-archived-never-deleted.md)) would be a convention in jsonb, with no guard in the database
  and nothing the archive lint can check. A familiar's history, restore and sync with Foundry would all work on a
  document patch.
- **A row of its own** (chosen). Archive, restore, the delete guard and the audit trigger work as they do for every
  other archivable table, and Foundry sync and interop address a familiar by id.
- **Familiar-only types.** Cheaper now, but animal companions (M23) would copy the table, the archive and the play state.

## Decision

1. **A familiar is both stored and derived.** The row holds its identity: the kind, the name, the form and the slot that
   granted it. Its statistics (HP, AC, saves, Perception, skills, speeds) are never stored. The engine derives them
   from the master on every read, with breakdowns, so a change to the master's level or attributes changes the
   familiar.
2. **One `character_companions` row per companion.** Columns: `id`, `character_id` (FK, restrict), `kind`, `name`,
   `form` (jsonb; its shape settles with [#2041](https://github.com/DavidDudson/pioneer/issues/2041)), `granted_by`
   (the granting `SlotKey`), `created_at`, `archived_at` and `archive_reason` (the sketch is in
   [character-model.md](../architecture/character-model.md#companions)). It calls `audit.enable` and `archive.protect`,
   and joins `ARCHIVABLE_TABLES`. A partial unique index on `(character_id, kind) where archived_at is null` holds one
   active familiar per character; a kind that allows more (Additional Companion) drops the index for that kind in its own
   ADR.
3. **The row has no version.** A write to it runs in the character's transaction and bumps `characters.version`, so one
   optimistic lock guards the whole build. This differs from the party stash, which is shared by many characters and so
   needs a version of its own.
4. **Build and play state are split as for the character.**
   - **Build:** the day's familiar and master abilities, and the spells it knows, are choice slots in `build.choices`,
     keyed `companion:<id>:ability:<n>` and `companion:<id>:spell:<n>` ([ADR-0044](0044-prepared-spells-are-choice-slots.md)).
   - **Play:** `PlayState.companions` maps `CompanionId` to `{ damage, temp, conditions, status }`. `status` is
     `active`, `absent`, `absorbed` or `dead`. Current HP is the derived maximum minus damage
     ([ADR-0004](0004-store-inputs-not-derived-values.md)). Play commands never touch `characters.version`.
5. **Archive.**
   - **Death is play state.** A dead familiar keeps its row, because a witch's patron replaces it the next day and a
     resurrection brings it back.
   - **Replacement archives.** Replacing a familiar (by choice, in downtime or by the patron) and releasing it set
     `archived_at` and a `CompanionArchiveReason` (`replaced`, `released`) and insert the new row in one transaction.
   - **History** is the character's archived rows, newest first, plus `audit.log`. `restore` clears `archived_at`
     (resurrection); it is refused while another active companion of the kind holds the unique index.
   - Only the owner reads archived companions; to everyone else they do not exist.
6. **One substrate for every companion.** `Companion` is a discriminated union on `kind`: `familiar` now, then
   `animal-companion`, `eidolon` and the special companions. M22 builds only `familiar`. M23 reuses the table, the
   archive and restore, the play-state map, the "has an active companion of kind X" prerequisite predicate and the card
   shell, and adds only its kind's own fields (tier, support benefit) and its own derivation. The derivations are not
   shared: a familiar derives from the master's level, a companion from a stat block and tier, an eidolon shares the
   master's HP. A spell summon or other minion lasts a scene and stays transient play state, not a companion.
7. **Brands and sets.**
   - `libs/character/domain`: `CompanionId` (a `Uuid` brand), `CompanionArchiveReason` and `CompanionStatus` (const
     objects with their `z.enum` schemas).
   - `libs/rules/sdk`: `CompanionKind`, so that rules, prerequisites and `TargetKind` can name a kind without importing
     the character context.
   - No `FamiliarAbilityId`: an ability is the `ContentId` of an `action` whose `category` is `familiar`.
   - The number of abilities is a derived count with a breakdown, not a stored one.

## Consequences

- [#2049](https://github.com/DavidDudson/pioneer/issues/2049) becomes "a character owns a companion (familiar kind)": a
  migration with the table, the guard, the audit call and the lint entry, the domain types and brands, the repository, and
  the contract with archive and restore.
- The form and name are written to the row, not to `build.choices`. The builder step
  ([#2051](https://github.com/DavidDudson/pioneer/issues/2051)) still shows the slot and its status in Choices, from the
  row.
- The prerequisite "a familiar" ([#2052](https://github.com/DavidDudson/pioneer/issues/2052)) reads "has an active
  companion of kind `familiar`".
- A build save that adds or replaces a companion writes two tables in one transaction. A conflict on
  `characters.version` rolls both back.
- The shape of `form` waits on [#2041](https://github.com/DavidDudson/pioneer/issues/2041). Until then it stays an open
  jsonb, which `schema_version` can tighten later.
- M23's [#2128](https://github.com/DavidDudson/pioneer/issues/2128) confirms an `animal-companion` variant of this
  record rather than deciding a model.
