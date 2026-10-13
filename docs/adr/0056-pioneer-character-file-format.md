# 0056. The Pioneer character file names content by pack and slug

- Status: Proposed
- Date: 2026-10-14

## Context

Characters need to leave Pioneer and come back: a backup, a character moved between servers, a character shared with a
friend. The stored document ([0004](0004-store-inputs-not-derived-values.md)) is already the character's inputs and nothing
derived, but it names content by id, and an id is a UUIDv5 hash of `<pack>/<slug>` ([0034](0034-entry-slugs-name-their-kind.md)).
A hash tells a reader of the file nothing, and a pack that is not loaded cannot be told from a typo. Embedding homebrew
in the file builds on this one ([0058](0058-pioneer-files-embed-the-homebrew-they-use.md)).

## Decision

A file is an envelope around the character's stored inputs:

```json
{ "format": "pioneer-character", "formatVersion": 1, "character": { "schemaVersion": 6, "name": "…", … } }
```

- **Stored inputs only.** `character` is the `CharacterDocument` without `id` and `ownerId`: a file is always
  imported as a new character of the importing user. Nothing derived is written.
- **References name pack and slug.** Wherever the document holds a content id (choices, spell access, inventory items
  and their property runes, conditions, the links inside notes, appearance and personality) the file holds
  `{ "source": "<pack id>", "slug": "<kind>:<name>" }`. The slug names the kind
  ([0034](0034-entry-slugs-name-their-kind.md)), the source names the pack ([0005](0005-mandatory-source-references.md)).
  Reading hashes them back to the id, so no registry is needed to import; exporting needs one to name an id, and an
  id it cannot name fails the export rather than writing a reference nothing could read.
- **Campaign events are left out.** `appliedBy` on a condition names an event that exists only in its campaign.
- **One list of reference places.** `rewriteReferences` walks them for both directions, so export and read cannot
  disagree. The read path then validates through the document schema itself, so the file cannot hold what a stored
  character could not.

### Versioning

Two versions, each with one rule:

- `formatVersion` is the file's own shape: the envelope and how references are written. It rises only when a file
  written before could no longer be read as it is. A reader refuses a version above its own (`newer-format`).
- `character.schemaVersion` is the document's, and the existing upgrade chain reads every older one
  (`decodeCharacterDocument`). A new character field is a new schema version, not a new format version, so files
  written yesterday keep importing. A newer one is refused (`newer-character`), never guessed at.

## Consequences

- Reading is pure and needs no content: an unknown reference imports as an id that resolves to nothing; invalidated
  choices are flagged, never deleted ([0004](0004-store-inputs-not-derived-values.md)).
- Round trip is the identity for any character whose ids all hash from a pack and slug, which every real one does;
  a property test holds it.
- The file is readable by eye and diffable, at the cost of size over bare ids.
- Embedding homebrew ([0058](0058-pioneer-files-embed-the-homebrew-they-use.md)), the sheet's export and import
  actions, and Pathbuilder-style reports are separate stories built on `libs/interop/pioneer`.
