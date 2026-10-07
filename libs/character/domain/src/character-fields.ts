import { z } from 'zod';

/** Branded so a character id can't be passed where another id is expected. */
export const CharacterId = z.uuid().brand('CharacterId');
export type CharacterId = z.infer<typeof CharacterId>;

export const CHARACTER_LEVEL_MIN = 1;
export const CHARACTER_LEVEL_MAX = 20;
export const CHARACTER_NAME_MAX_LENGTH = 80;

export const CharacterNameSchema = z.string().trim().min(1).max(CHARACTER_NAME_MAX_LENGTH);
export const CharacterLevelSchema = z.number().int().min(CHARACTER_LEVEL_MIN).max(CHARACTER_LEVEL_MAX);
