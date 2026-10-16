import {
  addItem,
  EMPTY_INVENTORY,
  INVESTED_MAX,
  InventoryItemId,
  inventoryViolations,
  ItemOrigin,
  ItemQuantity,
} from '@pioneer/character/domain';
import type { Inventory, InventoryItem } from '@pioneer/character/domain';
import { ItemFixture, itemFixtureContent, itemFixtureId, runeFixtureContent } from '@pioneer/character/domain/testing';
import { describe, expect, it } from 'vitest';

import { sheetInventory } from './sheet-inventory';
import { reasonsByItem, ruleBreakingCount, ViolationMessage } from './sheet-violations';

const runed = { items: itemFixtureContent(), runes: runeFixtureContent() };
const one = ItemQuantity.parse(1);

function idAt(index: number): InventoryItemId {
  return InventoryItemId.parse(`00000000-0000-4000-8000-${String(index).padStart(12, '0')}`);
}

function importedInvested(item: InventoryItem): InventoryItem {
  return { ...item, origin: ItemOrigin.Import, invested: true };
}

/** One rope more than can be invested, all of them imported and invested. */
function overInvested(): Inventory {
  let inventory = EMPTY_INVENTORY;
  for (let index = 0; index <= INVESTED_MAX; index += 1) {
    inventory = addItem(inventory, {
      id: idAt(index),
      item: itemFixtureId(ItemFixture.Rope),
      quantity: one,
      container: undefined,
    });
  }
  return { ...inventory, items: inventory.items.map((each) => importedInvested(each)) };
}

describe('the rules an imported inventory breaks', () => {
  const inventory = overInvested();
  const violations = inventoryViolations(inventory, runed);

  it('gives each item that passes the limit a reason with the limit and the count', () => {
    expect(reasonsByItem(violations, runed.runes).get(idAt(INVESTED_MAX))).toStrictEqual([
      { key: ViolationMessage.Invested, params: { limit: INVESTED_MAX, actual: INVESTED_MAX + 1 } },
    ]);
  });

  it('counts the items that break a rule, once each', () => {
    expect(ruleBreakingCount(violations)).toBe(1);
    expect(ruleBreakingCount([...violations, ...violations])).toBe(1);
  });

  it('puts the reasons on the sheet lines, and none on the lines within the limit', () => {
    const lines = sheetInventory(inventory, runed).flatMap((group) => group.lines);
    expect(lines.filter((line) => line.breaks.length > 0).map((line) => line.id)).toStrictEqual([idAt(INVESTED_MAX)]);
  });
});
