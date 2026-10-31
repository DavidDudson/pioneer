import { ChoiceValue, ContentId, Level, PackId, RichText, SlotKey, Slug, uniqueItems } from '@pioneer/rules/sdk';
import { UserId } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { CURRENT_SCHEMA_VERSION, StoredCharacterDocument, upgradeDocument } from './character-document-upgrades';
import { CharacterId, CharacterLevel, CharacterName } from './character-fields';
import { LoreName } from './custom-lore';
import { EMPTY_INVENTORY, InventorySchema } from './inventory';
import { OVERRIDES_MAX, OverrideSchema } from './override-schema';
import { FRESH_PLAY, PlayStateSchema } from './play-state';

/**
 * Nothing yet. Boons and conditions (#39) widen these, each with a new schema version.
 */
const None = z.tuple([]);

/** The most uncommon and rare spells a build lists access to. */
export const SPELL_ACCESS_MAX = 500;

/** The most imported feats a build keeps with no slot to hold them. */
export const UNPLACED_FEATS_MAX = 100;

/** The most imported languages a build keeps with no slot to hold them. */
export const UNPLACED_LANGUAGES_MAX = 100;

/** A repertoire slot swapped at `level`. */
const RepertoireSwapRecord = z.strictObject({ level: Level, slot: SlotKey });

/**
 * Everything the player picked. Selections are kept for slots the character doesn't have (character-model.md).
 * `spellAccess` lists the uncommon and rare spells the character may prepare, each once (#478). `unplacedFeats` lists
 * the feats an import found that no slot offers, each once: kept so the character carries them, flagged as breaking
 * a rule until a pick of one in a slot, or the player, takes it off the list. `unplacedHeritage` and `unplacedLanguages`
 * keep, the same way, the heritage the ancestry does not offer and the languages no slot has room for.
 */
export const BuildSchema = z.strictObject({
  choices: z.record(SlotKey, ChoiceValue).default({}),
  spellAccess: z.array(ContentId).max(SPELL_ACCESS_MAX).readonly().check(uniqueItems).default([]),
  unplacedFeats: z.array(ContentId).max(UNPLACED_FEATS_MAX).readonly().check(uniqueItems).default([]),
  unplacedHeritage: ContentId.optional(),
  unplacedLanguages: z.array(ContentId).max(UNPLACED_LANGUAGES_MAX).readonly().check(uniqueItems).default([]),
  /** The custom Lores the player named, by topic: `lore:sailing` picks read their name here (#572). */
  lores: z.record(Slug, LoreName).default({}),
  /** The repertoire slot swapped at each level, one a level-up (#594). */
  repertoireSwaps: z.array(RepertoireSwapRecord).readonly().default([]),
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
  build: BuildSchema.default({
    choices: {},
    spellAccess: [],
    unplacedFeats: [],
    unplacedLanguages: [],
    lores: {},
    repertoireSwaps: [],
    boons: [],
  }),
  inventory: InventorySchema.default(EMPTY_INVENTORY),
  /** Stored apart, in `character_play` (ADR-0022); a build save never writes it. */
  play: PlayStateSchema.default(FRESH_PLAY),
  /** What was set by hand on a statistic, removed ones kept (#1127); only the active ones compile to rule elements. */
  overrides: z.array(OverrideSchema).max(OVERRIDES_MAX).readonly().default([]),
  notes: RichText.default([]),
  /** What the character looks like, shown on the Exploration tab (#500). */
  appearance: RichText.default([]),
  /** How the character acts and what they care about, shown on the Exploration tab (#500). */
  personality: RichText.default([]),
});
export type CharacterDocument = z.infer<typeof CharacterDocumentSchema>;

/**
 * A stored document that isn't a valid one of any known version. The fault is the server's data, not the request,
 * so it is a plain `Error` (a logged 500), never a `ZodError` (a 422 that would list the document's paths).
 */
export class CorruptCharacterDocumentError extends Error {
  public override readonly name = 'CorruptCharacterDocumentError';

  public constructor(cause: z.ZodError) {
    super(`Stored character document is invalid: ${z.prettifyError(cause)}`, { cause });
  }
}

/**
 * Reads a stored document of any known schema version, upgrading it to the current one first. Throws
 * `CorruptCharacterDocumentError` when it isn't a valid document, `UnsupportedSchemaVersionError` when it is newer
 * than this code.
 */
export function decodeCharacterDocument(stored: unknown): CharacterDocument {
  const versioned = StoredCharacterDocument.safeParse(stored);
  if (!versioned.success) {
    throw new CorruptCharacterDocumentError(versioned.error);
  }
  const document = CharacterDocumentSchema.safeParse(upgradeDocument(versioned.data));
  if (!document.success) {
    throw new CorruptCharacterDocumentError(document.error);
  }
  return document.data;
}
