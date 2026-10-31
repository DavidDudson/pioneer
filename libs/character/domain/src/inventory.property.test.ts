import { describe, expect, test } from 'bun:test';

import { assert, nat, option, pre, property } from 'fast-check';

import { inventoryRefusal, InventorySchema, moveItem, removeItem } from './inventory';
import type { Inventory, InventoryItem, InventoryItemId } from './inventory';
import { inventory } from './testing';

const maybeIndex = option(nat(), { nil: undefined });

/** The item at `index` of a non-empty inventory, wrapping round. */
function pick(stock: Inventory, index: number): InventoryItem {
  const item = stock.items[index % stock.items.length];
  if (item === undefined) {
    throw new Error('pick needs a non-empty inventory');
  }
  return item;
}

/** Every item `id` holds, directly or inside something it holds. */
function contents(stock: Inventory, id: InventoryItemId): ReadonlySet<InventoryItemId> {
  const held = new Set<InventoryItemId>();
  let added = true;
  while (added) {
    added = false;
    for (const each of stock.items) {
      const inside = each.container !== undefined && (each.container === id || held.has(each.container));
      if (inside && !held.has(each.id)) {
        held.add(each.id);
        added = true;
      }
    }
  }
  return held;
}

describe('inventory edits (properties)', () => {
  test('removing an item keeps every other item, and the inventory valid', () => {
    assert(
      property(inventory, nat(), (stock, index) => {
        pre(stock.items.length > 0);
        const removed = pick(stock, index);
        const after = removeItem(stock, removed.id);
        expect(after.items.map((each) => each.id)).toStrictEqual(
          stock.items.filter((each) => each.id !== removed.id).map((each) => each.id),
        );
        expect(InventorySchema.safeParse(after).success).toBe(true);
      }),
    );
  });

  test('removing a container keeps what it held inside whatever held it', () => {
    assert(
      property(inventory, nat(), (stock, index) => {
        pre(stock.items.length > 0);
        const removed = pick(stock, index);
        const after = removeItem(stock, removed.id);
        for (const each of after.items) {
          const before = stock.items.find((item) => item.id === each.id);
          const expected = before?.container === removed.id ? removed.container : before?.container;
          expect(each.container).toBe(expected);
        }
      }),
    );
  });

  test('a move the inventory allows keeps it valid; one it refuses would put a container inside itself', () => {
    assert(
      property(inventory, nat(), maybeIndex, (stock, index, target) => {
        pre(stock.items.length > 0);
        const moved = pick(stock, index);
        const container = target === undefined ? undefined : pick(stock, target).id;
        const refusal = inventoryRefusal(stock, { id: moved.id, container });
        const loops = container !== undefined && (container === moved.id || contents(stock, moved.id).has(container));
        expect(refusal !== undefined).toBe(loops);
        if (refusal === undefined) {
          const after = moveItem(stock, moved.id, container);
          expect(InventorySchema.safeParse(after).success).toBe(true);
        }
      }),
    );
  });
});
