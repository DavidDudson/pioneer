import { isOverridePatch, OverrideProblem, overrideProblem } from '@pioneer/character/domain';
import type { Character, CharacterPatch } from '@pioneer/character/domain';
import { message, ValidationError } from '@pioneer/shared/kernel';

/** Why an override edit is refused, as a message key. */
const OVERRIDE_REFUSALS = {
  [OverrideProblem.Unknown]: 'character.validation.overrideUnknown',
  [OverrideProblem.Full]: 'character.validation.overrideFull',
  [OverrideProblem.Exhausted]: 'character.validation.overrideRevisionsFull',
} as const satisfies Record<OverrideProblem, string>;

/** Refuses an override edit of an override that isn't there, or one past what a character or an override keeps. */
export function assertOverrideAllowed(character: Character, patch: CharacterPatch): void {
  const problem = isOverridePatch(patch) ? overrideProblem(character.document, patch) : undefined;
  if (problem !== undefined) {
    throw new ValidationError([{ path: ['patch'], message: message(OVERRIDE_REFUSALS[problem]) }]);
  }
}
