import * as z from 'zod';

import { Character } from './character';
import { SheetDeity } from './character-deity';
import { CharacterLanguages } from './character-languages';
import { CharacterSlot } from './character-slot';
import { ClearedPick } from './dependent-picks';
import { OverrideAuthor } from './override-schema';

/**
 * One character as its sheet reads it: the character, every slot it has with its status (#419), its languages (#470)
 * and its deity (#469), with the description the browser's content has no copy of. They are worked out from the picks
 * and the server's content on each read, never stored, so the character's wire stays inputs only.
 */
export const CharacterSheet = z.object({
  character: Character.codec,
  slots: z.array(CharacterSlot).readonly(),
  languages: CharacterLanguages,
  deity: SheetDeity.optional(),
  /** The names of the users who authored the character's overrides; a user nobody can name is left out. */
  authors: z.array(OverrideAuthor).readonly().optional(),
});
export type CharacterSheet = z.output<typeof CharacterSheet>;

/**
 * A PATCH's answer: the sheet, and the picks the edit cleared because a slot they are within changed (a heritage of
 * the old ancestry). Reported once, here; a later read has no record of them.
 */
export const PatchedCharacterSheet = CharacterSheet.extend({ cleared: z.array(ClearedPick).readonly() });
export type PatchedCharacterSheet = z.output<typeof PatchedCharacterSheet>;
