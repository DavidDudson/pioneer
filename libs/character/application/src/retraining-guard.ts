import { CharacterPatchField, retrainDaysFor, slotRefusal } from '@pioneer/character/domain';
import type { Character, CharacterPatch, RetrainingPatch, SlotContent, SlotPick } from '@pioneer/character/domain';
import { message, ValidationError } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

type StartPatch = Extract<RetrainingPatch, { readonly field: typeof CharacterPatchField.StartRetraining }>;

type WorkPatch = Extract<RetrainingPatch, { readonly field: typeof CharacterPatchField.WorkRetraining }>;

/** An edit refused for `reason`, blamed on the patch. */
function refused(reason: MessageDescriptor): ValidationError {
  return new ValidationError([{ path: ['patch'], message: reason }]);
}

/** Whether `patch` starts, works on or cancels a retraining. */
export function isRetrainingEdit(patch: CharacterPatch): patch is RetrainingPatch {
  return (
    patch.field === CharacterPatchField.StartRetraining ||
    patch.field === CharacterPatchField.WorkRetraining ||
    patch.field === CharacterPatchField.CancelRetraining
  );
}

/** Refuses a pick `slots` don't offer in `slot`. */
function assertOffered(character: Character, slots: SlotContent, pick: SlotPick): void {
  const refusal = slotRefusal(character.document, slots, pick);

  if (refusal !== undefined) {
    throw new ValidationError([{ path: ['patch', refusal.field], message: refusal.message }]);
  }
}

function assertStartAllowed(character: Character, slots: SlotContent, { slot, to }: StartPatch): void {
  const { retraining, choices } = character.document.build;

  if (retraining !== undefined) {
    throw refused(message('character.validation.retrainingBusy'));
  }

  if (retrainDaysFor(slot) === undefined || choices[slot] === undefined) {
    throw refused(message('character.validation.retrainingNotAllowed'));
  }

  if (choices[slot] === to) {
    throw refused(message('character.validation.retrainingSame'));
  }

  assertOffered(character, slots, { slot, selection: to });
}

function assertWorkAllowed(character: Character, slots: SlotContent, { days }: WorkPatch): void {
  const { retraining } = character.document.build;

  if (retraining === undefined) {
    throw refused(message('character.validation.retrainingNone'));
  }

  if (retraining.daysDone + days >= retraining.daysNeeded) {
    assertOffered(character, slots, { slot: retraining.slot, selection: retraining.to });
  }
}

/** Refuses a retraining edit the character can't make, or a slot edit on the slot being retrained; else lets it by. */
export function assertRetrainingAllowed(character: Character, slots: SlotContent, patch: CharacterPatch): void {
  if (patch.field === CharacterPatchField.StartRetraining) {
    assertStartAllowed(character, slots, patch);
  } else if (patch.field === CharacterPatchField.WorkRetraining) {
    assertWorkAllowed(character, slots, patch);
  } else if (
    (patch.field === CharacterPatchField.SelectSlot || patch.field === CharacterPatchField.ClearSlot) &&
    patch.slot === character.document.build.retraining?.slot
  ) {
    throw refused(message('character.validation.retrainingSlotBusy'));
  }
}
