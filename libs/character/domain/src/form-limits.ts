import type { CharacterDocument } from './character-document';
import { equippedGrants } from './equipped';
import type { ItemContent } from './inventory-content';
import type { SlotContent } from './slot-offer';

/** What the battle form in force forbids (#531); a flag the form leaves out forbids nothing. */
export interface FormLimits {
  readonly cantCast: boolean;
  readonly cantSpeak: boolean;
  readonly noHands: boolean;
}

/** What the battle form the character is in forbids; undefined when it is in none. */
export function formLimits(
  document: CharacterDocument,
  content: ItemContent,
  slots: SlotContent,
): FormLimits | undefined {
  const form = equippedGrants(document, content, slots).form?.form;
  return form === undefined
    ? undefined
    : { cantCast: form.canCast === false, cantSpeak: form.canSpeak === false, noHands: form.hasHands === false };
}
