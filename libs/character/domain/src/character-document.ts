import { ChoiceValue, PackId, RichText, SlotKey } from '@pioneer/rules/sdk';
import { UserId } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { CURRENT_SCHEMA_VERSION, StoredCharacterDocument, upgradeDocument } from './character-document-upgrades';
import { CharacterId, CharacterLevel, CharacterName } from './character-fields';

/**
 * Nothing yet. Inventory (#28), play state (#38), boons and conditions (#39) and overrides (#34) widen these with
 * defaulted fields, so a document written before them still decodes without an upgrade step.
 */
const Empty = z.strictObject({});
const None = z.tuple([]);

/** Everything the player picked. Selections are kept for slots the character doesn't have (character-model.md). */
export const BuildSchema = z.strictObject({
  choices: z.record(SlotKey, ChoiceValue).default({}),
  boons: None.default([]),
});
export type Build = z.infer<typeof BuildSchema>;

/**
 * A character as the player's inputs to the engine, at the current schema version. Nothing derived is stored:
 * attribute modifiers, totals and proficiencies are worked out from these on every read.
 */
export const CharacterDocumentSchema = z.strictObject({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  id: CharacterId,
  ownerId: UserId,
  name: CharacterName,
  level: CharacterLevel,
  /** Content the character draws on; campaign packs take precedence. */
  packs: z.array(PackId).readonly().default([]),
  build: BuildSchema.default({ choices: {}, boons: [] }),
  inventory: Empty.default({}),
  play: Empty.default({}),
  overrides: None.default([]),
  notes: RichText.default([]),
});
export type CharacterDocument = z.infer<typeof CharacterDocumentSchema>;

/**
 * Reads a stored document of any known schema version, upgrading it to the current one first. Throws a `ZodError`
 * when it isn't a valid document, `UnsupportedSchemaVersionError` when it is newer than this code.
 */
export function decodeCharacterDocument(stored: unknown): CharacterDocument {
  return CharacterDocumentSchema.parse(upgradeDocument(StoredCharacterDocument.parse(stored)));
}
