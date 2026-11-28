import type { CharacterPatch, CharacterPatchField } from './character-patch';

/** The edits that start, work on or cancel a retraining. */
export type RetrainingPatch = Extract<
  CharacterPatch,
  {
    readonly field:
      | typeof CharacterPatchField.StartRetraining
      | typeof CharacterPatchField.WorkRetraining
      | typeof CharacterPatchField.CancelRetraining;
  }
>;
