import { AncestryId, AttributeModifier, AttributeSchema } from '@pioneer/rules/sdk';
import { Version } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import { z } from 'zod';

import { CharacterLevel, CharacterName } from './character-fields';

/** Every field the sheet can edit inline. One PATCH per field edit. */
export const CharacterPatchField = {
  Name: 'name',
  Ancestry: 'ancestry',
  Level: 'level',
  Attribute: 'attribute',
} as const;
export type CharacterPatchField = ValueOf<typeof CharacterPatchField>;

export const CharacterPatchSchema = z.discriminatedUnion('field', [
  z.object({ field: z.literal(CharacterPatchField.Name), value: CharacterName }),
  z.object({ field: z.literal(CharacterPatchField.Ancestry), value: AncestryId }),
  z.object({ field: z.literal(CharacterPatchField.Level), value: CharacterLevel }),
  z.object({
    field: z.literal(CharacterPatchField.Attribute),
    attribute: AttributeSchema,
    value: AttributeModifier,
  }),
]);
export type CharacterPatch = z.infer<typeof CharacterPatchSchema>;

/** PATCH body: the edit plus the version the client last saw. */
export const PatchCharacterBody = z.object({
  expectedVersion: Version,
  patch: CharacterPatchSchema,
});
export type PatchCharacterBody = z.infer<typeof PatchCharacterBody>;
