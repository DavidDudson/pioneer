import { ContainerEffect, InventoryItemId, InventorySchema } from '@pioneer/character/domain';
import type { Inventory } from '@pioneer/character/domain';
import { ItemFixture, itemFixtureContent, itemFixtureId } from '@pioneer/character/domain/testing';
import { shownRows } from '@pioneer/rules/ui';
import { describe, expect, it } from 'vitest';

import { PLACE_ORDER, placeRows } from './place-picker';

const content = itemFixtureContent();
const BACKPACK = '11111111-1111-4111-8111-111111111111';
const ROPE = '22222222-2222-4222-8222-222222222222';
const ANVIL = '33333333-3333-4333-8333-333333333333';
const LOOSE_NAME = 'Not in a container';

function stock(items: readonly object[]): Inventory {
  return InventorySchema.parse({ items, coins: {} });
}

const inventory = stock([
  { id: BACKPACK, item: itemFixtureId(ItemFixture.Backpack), quantity: 1 },
  { id: ROPE, item: itemFixtureId(ItemFixture.Rope), quantity: 1, container: BACKPACK },
  { id: ANVIL, item: itemFixtureId(ItemFixture.Anvil), quantity: 1 },
]);

describe(placeRows, () => {
  it('lists the loose place first, with the lines carried loose and no Bulk figure', () => {
    const [loose] = placeRows(inventory, content, { moving: undefined, loose: LOOSE_NAME });

    expect(loose).toMatchObject({ label: LOOSE_NAME, held: undefined, capacity: undefined, lines: 2 });
  });

  it('lists each container with what it holds against what it can', () => {
    const rows = placeRows(inventory, content, { moving: undefined, loose: LOOSE_NAME });
    const backpack = rows.find((each) => each.value === BACKPACK);

    expect(rows).toHaveLength(2);
    expect(backpack?.lines).toBe(1);
    expect(backpack?.capacity).toBeGreaterThan(0);
    expect(backpack?.held).toBeGreaterThanOrEqual(0);
  });

  it('says what each container does to the Bulk it holds, and nothing for the loose place', () => {
    const bag = '44444444-4444-4444-8444-444444444444';
    const withBag = stock([
      ...inventory.items,
      { id: bag, item: itemFixtureId(ItemFixture.BagOfHolding), quantity: 1 },
    ]);

    const rows = placeRows(withBag, content, { moving: undefined, loose: LOOSE_NAME });

    expect(rows[0]?.effect).toBeUndefined();
    expect(rows.find((each) => each.value === BACKPACK)?.effect).toBe(ContainerEffect.Ignores);
    expect(rows.find((each) => each.value === bag)?.effect).toBe(ContainerEffect.AddsNone);
  });

  it('leaves out the container being moved, so it cannot go into itself', () => {
    const rows = placeRows(inventory, content, { moving: InventoryItemId.parse(BACKPACK), loose: LOOSE_NAME });

    expect(rows.map((each) => each.value)).not.toContain(BACKPACK);
  });
});

describe('the place order', () => {
  it('searches by name and sorts by items, the loose place included', () => {
    const rows = placeRows(inventory, content, { moving: undefined, loose: LOOSE_NAME });

    expect(shownRows(rows, { query: 'pack', sort: undefined }, PLACE_ORDER)).toHaveLength(1);
    const byItems = shownRows(rows, { query: '', sort: { column: 'items', descending: false } }, PLACE_ORDER);
    expect(byItems.map((each) => each.lines)).toStrictEqual([1, 2]);
  });
});
