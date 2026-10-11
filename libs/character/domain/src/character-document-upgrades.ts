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
const UPGRADES: readonly UpgradeStep[] = [];

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
