import { describe, expect, test } from 'bun:test';

import { ContentId } from '@pioneer/rules/sdk';
import { assert, integer, property } from 'fast-check';

import { consumableInventoryAfter } from './consumable-commands';
import { addItem, EMPTY_INVENTORY, InventoryItemId, ItemQuantity } from './inventory';
import type { Inventory } from './inventory';

const ITEM = InventoryItemId.parse('00000000-0000-4000-8000-000000000001');
const POTION = ContentId.parse('00000000-0000-4000-8000-0000000000a1');
const STACK_MAX = 20;
const USES_MAX = 40;

function stack(quantity: number): Inventory {
  return addItem(EMPTY_INVENTORY, {
    id: ITEM,
    item: POTION,
    quantity: ItemQuantity.parse(quantity),
    container: undefined,
  });
}

/** The quantity of the stack, zero once the item is gone. */
function quantityOf(inventory: Inventory): number {
  return inventory.items.find(({ id }) => id === ITEM)?.quantity ?? 0;
}

/** The inventory after `uses` consumables are used from a stack of `start`. */
function usedFrom(start: number, uses: number): Inventory {
  let inventory = stack(start);
  for (let used = 0; used < uses; used += 1) {
    inventory = consumableInventoryAfter(inventory, ITEM);
  }
  return inventory;
}

describe('consumableInventoryAfter', () => {
  test('uses never take the quantity below zero, and the item is gone at zero', () => {
    assert(
      property(integer({ min: 1, max: STACK_MAX }), integer({ min: 0, max: USES_MAX }), (start, uses) => {
        const end = usedFrom(start, uses);
        expect(quantityOf(end)).toBe(Math.max(0, start - uses));
        expect(end.items.every(({ quantity }) => quantity > 0)).toBe(true);
      }),
    );
  });
});
