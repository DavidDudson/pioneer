import {
  CharacterPatchField,
  customEffectOf,
  CustomEffectProblem,
  customEffectProblem,
  isCustomEffectPatch,
  OverrideRole,
} from '@pioneer/character/domain';
import type { Character, CharacterPatch } from '@pioneer/character/domain';
import { ForbiddenError, message, ValidationError } from '@pioneer/shared/kernel';

/** Why a custom effect edit is refused, as a message key. */
const CUSTOM_EFFECT_REFUSALS = {
  [CustomEffectProblem.Unknown]: 'character.validation.customEffectUnknown',
  [CustomEffectProblem.Full]: 'character.validation.customEffectFull',
  [CustomEffectProblem.TogglesFull]: 'character.validation.customEffectTogglesFull',
} as const satisfies Record<CustomEffectProblem, string>;

/**
 * Refuses a custom effect edit of an effect that isn't there, or one past what a character or an effect keeps. An
 * effect a GM wrote stays the GM's to remove, though its owner may switch it: `actorRole` is what the actor is to the
 * character (#1132).
 */
export function assertCustomEffectAllowed(character: Character, patch: CharacterPatch, actorRole: OverrideRole): void {
  if (!isCustomEffectPatch(patch)) {
    return;
  }
  const problem = customEffectProblem(character.document, patch);
  if (problem !== undefined) {
    throw new ValidationError([{ path: ['patch'], message: message(CUSTOM_EFFECT_REFUSALS[problem]) }]);
  }
  if (patch.field === CharacterPatchField.RemoveCustomEffect && actorRole !== OverrideRole.Gm) {
    const found = customEffectOf(character.document, patch.id);
    if (found?.byRole === OverrideRole.Gm) {
      throw new ForbiddenError(
        `Custom effect ${patch.id} was written by the GM`,
        message('character.validation.customEffectGmOwned'),
      );
    }
  }
}
