import { SlotStatus } from '@pioneer/character/domain';
import type { CharacterSlot } from '@pioneer/character/domain';
import type { ContentId, SlotKey } from '@pioneer/rules/sdk';

import type { SheetFeatSlot } from './sheet-feats';

/**
 * The feat slots an unplaced feat could move into: open slots up to the character's level that offer it and have it
 * unlocked. A slot that already holds a pick is never offered, so moving a feat never replaces another.
 */
export function slotsOpenTo(
  feat: ContentId,
  feats: readonly SheetFeatSlot[],
  slots: readonly CharacterSlot[],
): readonly SheetFeatSlot[] {
  const open = new Set<SlotKey>(slots.filter((slot) => slot.status === SlotStatus.Open).map((slot) => slot.key));
  return feats.filter(
    (slot) => open.has(slot.key) && slot.options.some((option) => option.value === feat && option.locked === undefined),
  );
}
