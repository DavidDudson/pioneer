import { Pg, Uuid } from '@pioneer/shared/kernel';
import { z } from 'zod';

/** Branded so a character id can't be passed where another id is expected. */
export const CharacterId = Uuid.brand<'CharacterId'>();
export type CharacterId = z.infer<typeof CharacterId>;

export const CHARACTER_LEVEL_MIN = 1;
export const CHARACTER_LEVEL_MAX = 20;
export const CHARACTER_NAME_MAX_LENGTH = 80;

export const CharacterName = z.string().trim().min(1).max(CHARACTER_NAME_MAX_LENGTH).brand<'CharacterName'>();
export type CharacterName = z.infer<typeof CharacterName>;

/** A character's level, 1-20. Branded `Level` so it feeds the rules (`proficiencyBonus`) directly. */
export const CharacterLevel = Pg.smallint().min(CHARACTER_LEVEL_MIN).max(CHARACTER_LEVEL_MAX).brand<'Level'>();
export type CharacterLevel = z.infer<typeof CharacterLevel>;
