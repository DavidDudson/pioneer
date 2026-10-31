import {
  CharacterPatchField,
  isOverridePatch,
  overrideOf,
  OverrideProblem,
  overrideProblem,
  OverrideRole,
} from '@pioneer/character/domain';
import type { Character, CharacterPatch } from '@pioneer/character/domain';
import { ForbiddenError, message, ValidationError } from '@pioneer/shared/kernel';

/** Why an override edit is refused, as a message key. */
const OVERRIDE_REFUSALS = {
  [OverrideProblem.Unknown]: 'character.validation.overrideUnknown',
  [OverrideProblem.Full]: 'character.validation.overrideFull',
  [OverrideProblem.Exhausted]: 'character.validation.overrideRevisionsFull',
} as const satisfies Record<OverrideProblem, string>;

/**
 * Refuses an override edit of an override that isn't there, or one past what a character or an override keeps. An
 * override a GM wrote stays the GM's to remove, though its owner may edit it: `actorRole` is what the actor is to the character (#1131).
 */
export function assertOverrideAllowed(character: Character, patch: CharacterPatch, actorRole: OverrideRole): void {
  const problem = isOverridePatch(patch) ? overrideProblem(character.document, patch) : undefined;
  if (problem !== undefined) {
    throw new ValidationError([{ path: ['patch'], message: message(OVERRIDE_REFUSALS[problem]) }]);
  }
  const removes = patch.field === CharacterPatchField.RemoveOverride;
  if (removes && actorRole !== OverrideRole.Gm) {
    const found = overrideOf(character.document, patch.id);
    if (found?.byRole === OverrideRole.Gm) {
      throw new ForbiddenError(
        `Override ${patch.id} was written by the GM`,
        message('character.validation.overrideGmOwned'),
      );
    }
  }
}
