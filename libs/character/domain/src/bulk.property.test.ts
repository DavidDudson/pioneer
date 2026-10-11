import { describe, expect, test } from 'bun:test';

import { AttributeModifier } from '@pioneer/rules/sdk';
import { array, assert, constantFrom, integer, nat, property, record } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { carriedBulk, Encumbrance, inventoryBulk, LightBulk, wholeBulk } from './bulk';
import { carryItem, InventorySchema } from './inventory';
import type { Inventory } from './inventory';
import { CarryState } from './item-carry';
import { ItemFixture, itemFixtureContent, itemFixtureId } from './testing';

const content = itemFixtureContent();

const QUANTITY_MAX = 200;
const LINES_MAX = 8;
const LIGHT_PER_BULK = 10;

const PACK = '11111111-1111-4111-8111-111111111111';

function idOf(index: number): string {
  return `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
}

/** Light lines: `quantities` of one item, each its own line. */
function lightLines(item: ItemFixture, quantities: readonly number[]): Inventory {
  return InventorySchema.parse({
    items: quantities.map((quantity, index) => ({ id: idOf(index), item: itemFixtureId(item), quantity })),
  });
}

/** Items the fixtures weigh that have no usage limits on carrying them loose. */
const weighed = constantFrom(
  ItemFixture.Rope,
  ItemFixture.Anvil,
  ItemFixture.Arrows,
  ItemFixture.Longsword,
  ItemFixture.Diamond,
  ItemFixture.HealingPotion,
);

interface Line {
  readonly item: ItemFixture;
  readonly quantity: number;
  readonly packed: boolean;
}

const line: Arbitrary<Line> = record({
  item: weighed,
  quantity: integer({ min: 1, max: QUANTITY_MAX }),
  packed: constantFrom(true, false),
});

/** A worn backpack and lines stowed in it or loose. */
const packedInventory: Arbitrary<Inventory> = array(line, { maxLength: LINES_MAX }).map((lines) =>
  InventorySchema.parse({
    items: [
      { id: PACK, item: itemFixtureId(ItemFixture.Backpack), quantity: 1, carry: { state: CarryState.Worn } },
      ...lines.map(({ item, quantity, packed }, index) => ({
        id: idOf(index),
        item: itemFixtureId(item),
        quantity,
        ...(packed ? { container: PACK } : {}),
      })),
    ],
  }),
);

const quantities = array(integer({ min: 1, max: QUANTITY_MAX }), { minLength: 1, maxLength: LINES_MAX });

describe('Bulk arithmetic (properties)', () => {
  test('light items add up in tenths, and whole Bulk drops the fraction', () => {
    assert(
      property(quantities, (counts) => {
        const total = counts.reduce((sum, each) => sum + each, 0);
        const carried = carriedBulk(lightLines(ItemFixture.Rope, counts), content);

        expect(carried).toBe(LightBulk.parse(total));
        const fraction = total % LIGHT_PER_BULK;

        expect(wholeBulk(carried)).toBe(wholeBulk(LightBulk.parse(total - fraction)));
      }),
    );
  });

  test('items sold in batches weigh the same however their lines are split', () => {
    assert(
      property(quantities, (counts) => {
        const total = counts.reduce((sum, each) => sum + each, 0);
        const split = carriedBulk(lightLines(ItemFixture.Arrows, counts), content);
        const whole = carriedBulk(lightLines(ItemFixture.Arrows, [total]), content);

        expect(split).toBe(whole);
        expect(split).toBe(LightBulk.parse(Math.floor(total / LIGHT_PER_BULK)));
      }),
    );
  });

  test('dropping an item never adds Bulk', () => {
    assert(
      property(packedInventory, nat(), (stock, index) => {
        const item = stock.items[index % stock.items.length];
        if (item === undefined) {
          return;
        }
        const dropped = carryItem(stock, item.id, { state: CarryState.Dropped });

        expect(carriedBulk(dropped, content)).toBeLessThanOrEqual(carriedBulk(stock, content));
      }),
    );
  });

  test('is encumbered exactly when whole Bulk passes 5 plus Strength, and over its maximum past 10 plus it', () => {
    assert(
      property(packedInventory, integer({ min: -5, max: 7 }), (stock, modifier) => {
        const bulk = inventoryBulk(stock, content, AttributeModifier.parse(modifier));
        const whole = wholeBulk(bulk.carried);

        expect(bulk.encumbrance === Encumbrance.OverMaximum).toBe(whole > bulk.maximum);
        expect(bulk.encumbrance === Encumbrance.Unencumbered).toBe(whole <= bulk.encumberedAfter);
      }),
    );
  });
});
