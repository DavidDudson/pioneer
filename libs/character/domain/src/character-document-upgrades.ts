import { Pg } from '@pioneer/shared/kernel';
import * as z from 'zod';

/** The schema a stored `CharacterDocument` was written with. Starts at 1; each upgrade step adds one. */
export const CharacterSchemaVersion = Pg.smallint().min(1).brand<'CharacterSchemaVersion'>();
export type CharacterSchemaVersion = z.infer<typeof CharacterSchemaVersion>;

/** A stored document of any schema version: only `schemaVersion` is known until it has been upgraded. */
export const StoredCharacterDocument = z.looseObject({ schemaVersion: CharacterSchemaVersion });
export type StoredCharacterDocument = z.infer<typeof StoredCharacterDocument>;

/** Turns a document of one schema version into the next. Pure; `schemaVersion` is set by `upgradeDocument`. */
export type UpgradeStep = (document: StoredCharacterDocument) => StoredCharacterDocument;

/**
 * Every upgrade step, oldest first: `UPGRADES[0]` turns version 1 into 2, `UPGRADES[n]` turns n + 1 into n + 2.
 * Every change to the schema's shape adds a step, a new defaulted field included (its step returns the document
 * as it is), so code older than a document always refuses it by version (character-model.md, "Schema versions").
 */
const UPGRADES: readonly UpgradeStep[] = [
  /** 1 → 2: inventory items and coins (#471). A version 1 inventory is empty, which reads as no items and no coins. */
  (document) => document,
  /** 2 → 3: how each item is carried and whether it is invested (#472). A version 2 item reads as stowed, not invested. */
  (document) => document,
  /** 3 → 4: the uncommon and rare spells a build has access to (#478). A version 3 build has access to none. */
  (document) => document,
  /** 4 → 5: Hit Points in play (#343). A version 4 `play` is empty, which reads as full Hit Points. */
  (document) => document,
  /** 5 → 6: the character's appearance and personality, rich text (#500). A version 5 document has written neither. */
  (document) => document,
  /** 6 → 7: a second class beside the first (#705). A version 6 build has no `second-class` pick, which reads as none. */
  (document) => document,
  /** 7 → 8: the repertoire slot swapped at each level (#594). A version 7 build has swapped none. */
  (document) => document,
  /** 8 → 9: where an inventory line came from (#921). A version 8 line has no `origin`, which reads as the player's. */
  (document) => document,
  /** 9 → 10: the key item an inventory line is the holder's copy of (#924). A version 9 line has no `keyItem`, which reads as none. */
  (document) => document,
  /** 10 → 11: the feats an import found no slot for, kept on the build. A version 10 build has none. */
  (document) => document,
  /** 11 → 12: the heritage and languages an import found no slot for, kept on the build. A version 11 build has none. */
  (document) => document,
  /** 12 → 13: how long the character has been in each environment (#1291). A version 12 `play` has none, which reads as no time spent. */
  (document) => document,
  /** 13 → 14: overrides carry an author, a reason, earlier states and a removal (#1127). A version 13 document has none. */
  (document) => document,
  /** 14 → 15: an override records whether its author was the player or the GM (#1131). A version 14 override reads as the player's. */
  (document) => document,
  /** 15 → 16: the custom Lores a build names (#572). A version 15 build names none. */
  (document) => document,
  /** 16 → 17: the rituals a build knows (#1556). A version 16 build knows none. */
  (document) => document,
];

/** The version a chain of steps upgrades to: one past the last step. */
export function currentVersion(upgrades: readonly UpgradeStep[]): CharacterSchemaVersion {
  return CharacterSchemaVersion.parse(upgrades.length + 1);
}

export const CURRENT_SCHEMA_VERSION: CharacterSchemaVersion = currentVersion(UPGRADES);

/**
 * A stored document is newer than this code knows how to read, as after a rollback. Never guessed at: reading it
 * as the current schema could drop the newer fields on the next save.
 */
export class UnsupportedSchemaVersionError extends Error {
  public override readonly name = 'UnsupportedSchemaVersionError';
  public readonly found: CharacterSchemaVersion;
  public readonly current: CharacterSchemaVersion;

  public constructor(found: CharacterSchemaVersion, current: CharacterSchemaVersion) {
    super(`Character document schema version ${found} is newer than the current version ${current}`);
    this.found = found;
    this.current = current;
  }
}

/** Runs every step from the document's version up to the chain's current version. A current document is unchanged. */
export function upgradeDocument(
  stored: StoredCharacterDocument,
  upgrades: readonly UpgradeStep[] = UPGRADES,
): StoredCharacterDocument {
  const current = currentVersion(upgrades);
  if (stored.schemaVersion > current) {
    throw new UnsupportedSchemaVersionError(stored.schemaVersion, current);
  }
  let document = stored;
  for (const step of upgrades.slice(stored.schemaVersion - 1)) {
    document = { ...step(document), schemaVersion: CharacterSchemaVersion.parse(document.schemaVersion + 1) };
  }
  return document;
}
