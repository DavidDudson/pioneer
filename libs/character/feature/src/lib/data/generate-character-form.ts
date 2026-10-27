import { CharacterLevel, CharacterName, Seed } from '@pioneer/character/domain';
import * as z from 'zod';

/** A seed typed in the form: whole digits, or nothing at all to let the server draw one. */
const SeedText = z.union([
  z.literal('').transform(() => undefined),
  z.string().regex(/^\d+$/u).transform(Number).pipe(Seed),
]);

/** What the generate form submits; the same schemas the server validates with. */
export const GenerateCharacterForm = z.object({ level: CharacterLevel, seed: SeedText, name: CharacterName });
export type GenerateCharacterForm = z.output<typeof GenerateCharacterForm>;

/**
 * The form's own check, over what the fields hold (a number, text): signal forms read the schema's output as the
 * model, which `GenerateCharacterForm` transforms. Submitting parses with `GenerateCharacterForm` itself.
 */
export const GenerateCharacterFields = z.object({
  level: z.number().refine((level) => CharacterLevel.safeParse(level).success),
  seed: z.string().refine((seed) => SeedText.safeParse(seed).success),
  name: CharacterName,
});
