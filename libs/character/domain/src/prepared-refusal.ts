import type { ValueOf } from '@pioneer/shared/kernel';

import type { CharacterDocument } from './character-document';
import { NO_DEITY_SPELLS } from './deity-ranks';
import { PreparedPickProblem } from './prepared-pick-problem';
import { preparedSlots, problemOf } from './prepared-spells';
import type { PreparedReads } from './prepared-spells';
import type { SlotPick } from './slot-offer';

/**
 * Why a prepared slot refuses a spell: the character hasn't the slot at its level, or it doesn't offer the spell, an
 * uncommon or rare one that fits but has no access saying so. A pool's slot needs no access, so it only ever doesn't
 * offer one.
 */
export const PreparedRefusal = { NotOpen: 'notOpen', NotOffered: 'notOffered', NoAccess: 'noAccess' } as const;
export type PreparedRefusal = ValueOf<typeof PreparedRefusal>;

/** Why a pick's spell can't go in its prepared slot, or undefined when it can. */
export function preparedRefusal(
  document: CharacterDocument,
  reads: PreparedReads,
  { slot: key, selection }: SlotPick,
): PreparedRefusal | undefined {
  const slot = preparedSlots(document, reads).find((each) => each.key === key);
  if (slot === undefined) {
    return PreparedRefusal.NotOpen;
  }
  if (slot.options.some((spell) => spell.id === selection)) {
    return undefined;
  }
  const named = reads.spells.spell(selection);
  if (named === undefined || slot.pool !== undefined || slot.granted || slot.deitySpell) {
    return PreparedRefusal.NotOffered;
  }
  const noAccess =
    problemOf(named, {
      ...slot,
      takes: undefined,
      deity: NO_DEITY_SPELLS,
      gift: undefined,
      gifts: [],
      floating: false,
    }) === PreparedPickProblem.NoAccess;
  return noAccess ? PreparedRefusal.NoAccess : PreparedRefusal.NotOffered;
}
