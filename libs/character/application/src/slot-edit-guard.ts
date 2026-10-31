import { CharacterPatchField, repertoireSwapRefusal, slotRefusal } from '@pioneer/character/domain';
import type { Character, CharacterPatch, SlotContent } from '@pioneer/character/domain';
import { ValidationError } from '@pioneer/shared/kernel';

/**
 * Refuses a slot edit the slots `slots` don't allow: a selection the slot doesn't offer at any level up to 20, or for a
 * slot the character never has, and a second repertoire swap at the character's level. A selection already stored is
 * never checked again here: one a lower level hides, or content later invalidates, stays. Any other edit is let by.
 */
export function assertSlotEditAllowed(character: Character, slots: SlotContent, patch: CharacterPatch): void {
  if (patch.field !== CharacterPatchField.SelectSlot && patch.field !== CharacterPatchField.ClearSlot) {
    return;
  }
  const selection = patch.field === CharacterPatchField.SelectSlot ? patch.selection : undefined;
  const refusal =
    (patch.field === CharacterPatchField.SelectSlot ? slotRefusal(character.document, slots, patch) : undefined) ??
    repertoireSwapRefusal(character.document, slots, { slot: patch.slot, selection });
  if (refusal !== undefined) {
    throw new ValidationError([{ path: ['patch', refusal.field], message: refusal.message }]);
  }
}
