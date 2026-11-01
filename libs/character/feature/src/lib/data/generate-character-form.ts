import { CharacterName, Seed } from '@pioneer/character/domain';
import * as z from 'zod';

/** A seed typed in the form: whole digits, or nothing at all to let the server draw one. */
const SeedText = z.union([
  z.literal('').transform(() => undefined),
  z.string().regex(/^\d+$/u).transform(Number).pipe(Seed),
]);

/** What the generate form submits; the same schemas the server validates with. A generated character is level 1. */
export const GenerateCharacterForm = z.object({ seed: SeedText, name: CharacterName });
export type GenerateCharacterForm = z.output<typeof GenerateCharacterForm>;

/**
 * The form's own check, over what the fields hold (text): signal forms read the schema's output as the model, which
 * `GenerateCharacterForm` transforms. Submitting parses with `GenerateCharacterForm` itself.
 */
export const GenerateCharacterFields = z.object({
  seed: z.string().refine((seed) => SeedText.safeParse(seed).success),
  name: CharacterName,
});
