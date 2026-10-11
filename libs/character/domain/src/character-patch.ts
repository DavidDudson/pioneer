import { AttributeModifier, AttributeSchema, ChoiceValue, SlotKey } from '@pioneer/rules/sdk';
import { Version } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { CharacterLevel, CharacterName } from './character-fields';

/** Every edit the sheet makes: a field, or a choice slot. One PATCH per edit. */
export const CharacterPatchField = {
  Name: 'name',
  Level: 'level',
  Attribute: 'attribute',
  /** Pick an option in any slot the engine offers. */
  SelectSlot: 'selectSlot',
  ClearSlot: 'clearSlot',
} as const;
export type CharacterPatchField = ValueOf<typeof CharacterPatchField>;

export const CharacterPatchSchema = z.discriminatedUnion('field', [
  z.object({ field: z.literal(CharacterPatchField.Name), value: CharacterName }),
  z.object({ field: z.literal(CharacterPatchField.Level), value: CharacterLevel }),
  z.object({
    field: z.literal(CharacterPatchField.Attribute),
    attribute: AttributeSchema,
    value: AttributeModifier,
  }),
  z.object({ field: z.literal(CharacterPatchField.SelectSlot), slot: SlotKey, selection: ChoiceValue }),
  z.object({ field: z.literal(CharacterPatchField.ClearSlot), slot: SlotKey }),
]);
export type CharacterPatch = z.infer<typeof CharacterPatchSchema>;

/** PATCH body: the edit plus the version the client last saw. */
export const PatchCharacterBody = z.object({
  expectedVersion: Version,
  patch: CharacterPatchSchema,
});
export type PatchCharacterBody = z.infer<typeof PatchCharacterBody>;
