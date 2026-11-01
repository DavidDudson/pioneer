import { ChoiceValue, ClassRoleSchema, SlotKey } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { Character } from './character';
import { CharacterLevel, CharacterName } from './character-fields';
import { GenerationThemeSchema } from './generation-theme';
import { Seed } from './pick-source';

/** The most picks one generate call can keep: well over the slots of a level 20 character. */
const LOCKS_MAX = z.int().positive().brand<'LocksMax'>().parse(500);

/** A pick to keep when a character is made again: the slot and what is chosen in it. */
export const GenerateLock = z.strictObject({ slot: SlotKey, selection: ChoiceValue });
export type GenerateLock = z.infer<typeof GenerateLock>;

/**
 * A character made at random: `level` is how far to take it, `seed` makes the picks (the same seed, level, locks, theme
 * and packs give the same character; the server picks one when it is left out) and `name` replaces the rolled one.
 * `locks` are picks to keep: only the other slots are drawn, so a new seed with the same locks re-rolls the rest. A
 * lock the build cannot keep (its slot only opens under a pick that was not locked) is refused as a 422. `theme`
 * weighs the picks and, with a weapon, equips it. `role` draws the class from those that play it (by `seed`), unless a
 * lock already picks the class; a role no loaded class plays is a 422. `level` is 1 when left out.
 */
export const GenerateCharacterBody = z.object({
  level: CharacterLevel.optional(),
  seed: Seed.optional(),
  role: ClassRoleSchema.optional(),
  name: CharacterName.optional(),
  locks: z.array(GenerateLock).max(LOCKS_MAX).optional(),
  theme: GenerationThemeSchema.optional(),
});
export type GenerateCharacterBody = z.infer<typeof GenerateCharacterBody>;

/** A generated character, and the seed that made it: it is not stored, so this is the only time it is shown. */
export const GeneratedCharacter = z.object({ character: Character.codec, seed: Seed });
export type GeneratedCharacter = z.output<typeof GeneratedCharacter>;
