import { AncestryId, AttributeModifierSchema, AttributeSchema } from '@pioneer/rules/sdk';
import { VersionSchema } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import { z } from 'zod';

import { CharacterLevelSchema, CharacterNameSchema } from './character-fields';

/** Every field the sheet can edit inline. One PATCH per field edit. */
export const CharacterPatchField = {
  Name: 'name',
  Ancestry: 'ancestry',
  Level: 'level',
  Attribute: 'attribute',
} as const;
export type CharacterPatchField = ValueOf<typeof CharacterPatchField>;

export const CharacterPatchSchema = z.discriminatedUnion('field', [
  z.object({ field: z.literal(CharacterPatchField.Name), value: CharacterNameSchema }),
  z.object({ field: z.literal(CharacterPatchField.Ancestry), value: AncestryId }),
  z.object({ field: z.literal(CharacterPatchField.Level), value: CharacterLevelSchema }),
  z.object({
    field: z.literal(CharacterPatchField.Attribute),
    attribute: AttributeSchema,
    value: AttributeModifierSchema,
  }),
]);
export type CharacterPatch = z.infer<typeof CharacterPatchSchema>;

/** PATCH body: the edit plus the version the client last saw. */
export const PatchCharacterBody = z.object({
  expectedVersion: VersionSchema,
  patch: CharacterPatchSchema,
});
export type PatchCharacterBody = z.infer<typeof PatchCharacterBody>;
