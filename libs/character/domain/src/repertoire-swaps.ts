import { Level } from '@pioneer/rules/sdk';
import type { ChoiceValue, SlotKey } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';

import type { CharacterDocument } from './character-document';
import { spellSlotOpensAt } from './level-timeline';
import type { SlotContent } from './slot-offer';
import { SlotRefusalField } from './slot-refusals';
import type { SlotRefusal } from './slot-refusals';

const REPERTOIRE_PREFIX = 'repertoire:';

/**
 * What an edit to a repertoire slot costs (#594). Filling an empty slot, or changing one that opened at the
 * character's level, is free; replacing or emptying an older one is the level's one swap.
 */
export const RepertoireSwap = { Free: 'free', Counts: 'counts', Refused: 'refused' } as const;
export type RepertoireSwap = ValueOf<typeof RepertoireSwap>;

/** An edit to one slot: the spell it is given, or none when it is emptied. */
export interface SwapEdit {
  readonly slot: SlotKey;
  readonly selection?: ChoiceValue | undefined;
}

/**
 * What `selection` in `slot` (none when the slot is emptied) costs the character: a swap when the slot holds another
 * spell and opened below its level, refused when it already swapped a different slot at this level.
 */
export function repertoireSwap(document: CharacterDocument, content: SlotContent, edit: SwapEdit): RepertoireSwap {
  const { slot, selection } = edit;
  const stored = document.build.choices[slot];
  if (!slot.startsWith(REPERTOIRE_PREFIX) || stored === undefined || stored === selection) {
    return RepertoireSwap.Free;
  }
  const opens = spellSlotOpensAt(document, content, slot);
  if (opens === undefined || opens >= document.level) {
    return RepertoireSwap.Free;
  }
  const swapped = document.build.repertoireSwaps.find((each) => each.level === document.level)?.slot;
  return swapped === undefined || swapped === slot ? RepertoireSwap.Counts : RepertoireSwap.Refused;
}

/** The refusal for an edit that is a second swap at the character's level, or undefined when it is allowed. */
export function repertoireSwapRefusal(
  document: CharacterDocument,
  content: SlotContent,
  edit: SwapEdit,
): SlotRefusal | undefined {
  return repertoireSwap(document, content, edit) === RepertoireSwap.Refused
    ? {
        field: SlotRefusalField.Slot,
        message: message('character.validation.repertoireSwapUsed', { level: Level.parse(document.level) }),
      }
    : undefined;
}
