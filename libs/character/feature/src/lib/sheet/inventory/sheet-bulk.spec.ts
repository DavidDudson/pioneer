import { addItem, EMPTY_INVENTORY, InventoryItemId, ItemQuantity } from '@pioneer/character/domain';
import type { Inventory } from '@pioneer/character/domain';
import { ItemFixture, itemFixtureContent, itemFixtureId } from '@pioneer/character/domain/testing';
import { AttributeModifier } from '@pioneer/rules/sdk';
import { BulkStatus } from '@pioneer/rules/ui';
import { describe, expect, it } from 'vitest';

import { sheetBulk } from './sheet-bulk';

const content = itemFixtureContent();
const NO_STRENGTH = AttributeModifier.parse(0);

/** `count` anvils, 2 Bulk each. */
function anvils(count: number): Inventory {
  return addItem(EMPTY_INVENTORY, {
    id: InventoryItemId.parse('44444444-4444-4444-8444-444444444444'),
    item: itemFixtureId(ItemFixture.Anvil),
    quantity: ItemQuantity.parse(count),
    container: undefined,
  });
}

describe(sheetBulk, () => {
  it('gives the Bulk in tenths against the limits Strength sets', () => {
    expect(sheetBulk(anvils(2), content, NO_STRENGTH)).toStrictEqual({
      carried: 40,
      encumberedAfter: 5,
      maximum: 10,
      status: BulkStatus.Unencumbered,
    });
  });

  it('says encumbered past 5 plus Strength, and over the maximum past 10 plus it', () => {
    expect(sheetBulk(anvils(3), content, NO_STRENGTH).status).toBe(BulkStatus.Encumbered);
    expect(sheetBulk(anvils(6), content, NO_STRENGTH).status).toBe(BulkStatus.OverMaximum);
  });
});
