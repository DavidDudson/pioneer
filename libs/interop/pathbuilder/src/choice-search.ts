import { characterGrants } from '@pioneer/character/domain';
import type { CharacterDocument } from '@pioneer/character/domain';
import type { ChoiceSlot } from '@pioneer/rules/grants';
import { ChoiceValue } from '@pioneer/rules/sdk';
import type { SlotKey } from '@pioneer/rules/sdk';

import type { SpellPlacementContent } from './spell-listing';

/** An open choice and the option to answer it with. */
export type ChoicePick = readonly [slot: SlotKey, value: ChoiceValue];

/** The document with one more pick, to read what it would grant. */
export function picking(document: CharacterDocument, [key, value]: ChoicePick): CharacterDocument {
  return { ...document, build: { ...document.build, choices: { ...document.build.choices, [key]: value } } };
}

/** The open choice options, trying only the choices `accepts` when it is given. */
export function openPicks(
  document: CharacterDocument,
  content: SpellPlacementContent,
  accepts: (slot: ChoiceSlot) => boolean = () => true,
): ChoicePick[] {
  return characterGrants(document, content.slots)
    .open.filter((slot) => accepts(slot))
    .flatMap((slot) => slot.options.map((option): ChoicePick => [slot.key, ChoiceValue.parse(option.value)]));
}
