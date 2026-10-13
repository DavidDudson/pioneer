import { Pg } from '@pioneer/shared/kernel';
import * as z from 'zod';

/** Names the file as a Pioneer character, so any other JSON is refused before it is read. */
export const PIONEER_CHARACTER_FORMAT = 'pioneer-character';

/**
 * The version of the file's own shape: the envelope and how content is referenced. It rises only when a file written
 * before could no longer be read as it is; a new character field is a character schema version instead, which
 * `decodeCharacterDocument` upgrades on read (ADR-0056).
 */
export const FormatVersion = Pg.smallint().positive().brand<'PioneerFormatVersion'>();
export type FormatVersion = z.infer<typeof FormatVersion>;

export const CURRENT_FORMAT_VERSION: FormatVersion = FormatVersion.parse(1);

/** Just enough of a file to tell what it is and which version of the format it was written with. */
export const PioneerCharacterHeader = z.looseObject({
  format: z.literal(PIONEER_CHARACTER_FORMAT),
  formatVersion: FormatVersion,
});

/**
 * A character as a file: the envelope and the character's stored inputs (ADR-0004), with every content entry named
 * by pack and slug (`ContentReference`) in place of its id. The character is checked on read, by the character
 * document schema, once its references are ids again; the file never carries the character's id or owner.
 */
export const PioneerCharacterFile = PioneerCharacterHeader.extend({
  formatVersion: z.literal(CURRENT_FORMAT_VERSION),
  character: z.record(z.string(), z.unknown()),
}).strict();
export type PioneerCharacterFile = z.infer<typeof PioneerCharacterFile>;
