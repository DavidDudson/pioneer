import type { CharacterSchemaVersion } from '../character-document-upgrades';

/**
 * One stored document of every past schema version, in the shape that version wrote. A new upgrade step adds the
 * shape it upgrades from; `character-document.test.ts` fails until it does.
 */
export const PAST_DOCUMENTS: ReadonlyMap<CharacterSchemaVersion, unknown> = new Map();
