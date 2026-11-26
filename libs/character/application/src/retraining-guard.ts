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

/**
 * Refuses a retraining edit the character can't make: a second project, a pick that can't be retrained, nothing held
 * to swap or the same pick again, a replacement the slot doesn't offer, and work on no project. The last day's work
 * swaps the pick, so it checks that the slot still offers the replacement. Any other edit is let by.
 */
export function assertRetrainingAllowed(character: Character, slots: SlotContent, patch: CharacterPatch): void {
  if (patch.field === CharacterPatchField.StartRetraining) {
    assertStartAllowed(character, slots, patch);
  } else if (patch.field === CharacterPatchField.WorkRetraining) {
    assertWorkAllowed(character, slots, patch);
  }
}
