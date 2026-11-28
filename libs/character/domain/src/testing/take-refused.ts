import type { Character } from '../character';
import type { CharacterPatch } from '../character-patch';
import { CharacterPatchField } from '../character-patch';
import { canTakeCoins } from '../coin-gifts';

/** Whether `patch` takes coins the purse is worth less than, which the service refuses. */
export function takeRefused(held: Character, patch: CharacterPatch): boolean {
  return patch.field === CharacterPatchField.TakeCoins && !canTakeCoins(held.document, patch.coins);
}
