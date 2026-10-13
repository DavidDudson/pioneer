import * as z from 'zod';

import type { CharacterDocument } from './character-document';
import { CharacterPatchField } from './character-patch';
import type { ProsePatch } from './character-patch';

/** The most characters of plain text one prose field (appearance, personality) takes. */
export const CHARACTER_PROSE_MAX_LENGTH = 4000;

/** What the player types into a prose field: plain text, blank lines between paragraphs. Empty clears the field. */
export const CharacterProseInput = z.string().trim().max(CHARACTER_PROSE_MAX_LENGTH).brand<'CharacterProse'>();
export type CharacterProseInput = z.infer<typeof CharacterProseInput>;

/** `document` with the prose field `patch` names written. */
export function withProse(document: CharacterDocument, patch: ProsePatch): CharacterDocument {
  return patch.field === CharacterPatchField.SetAppearance
    ? { ...document, appearance: patch.value }
    : { ...document, personality: patch.value };
}
