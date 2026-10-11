import { Encumbrance, inventoryBulk } from '@pioneer/character/domain';
import type { Inventory, ItemContent } from '@pioneer/character/domain';
import type { AttributeModifier } from '@pioneer/rules/sdk';
import { BulkStatus } from '@pioneer/rules/ui';
import type { CarriedBulk } from '@pioneer/rules/ui';

const STATUS_OF: Readonly<Record<Encumbrance, BulkStatus>> = {
  [Encumbrance.Unencumbered]: BulkStatus.Unencumbered,
  [Encumbrance.Encumbered]: BulkStatus.Encumbered,
  [Encumbrance.OverMaximum]: BulkStatus.OverMaximum,
};

/** The Bulk `inventory` weighs against the limits `strength` sets, as the Bulk meter shows it. */
export function sheetBulk(inventory: Inventory, content: ItemContent, strength: AttributeModifier): CarriedBulk {
  const { carried, encumberedAfter, maximum, encumbrance } = inventoryBulk(inventory, content, strength);
  return { carried, encumberedAfter, maximum, status: STATUS_OF[encumbrance] };
}
