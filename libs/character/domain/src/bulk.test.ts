import { describe, expect, test } from 'bun:test';

import { AttributeModifier, BulkCount, BulkWeight } from '@pioneer/rules/sdk';

import { BulkLimit, carriedBulk, coinBulk, Encumbrance, inventoryBulk, LightBulk, lightBulk, wholeBulk } from './bulk';
import type { InventoryBulk } from './bulk';
import { CoinsSchema, InventorySchema } from './inventory';
import type { Inventory } from './inventory';
import { ItemFixture, itemFixtureContent, itemFixtureId } from './testing';

const content = itemFixtureContent();

const PACK = '11111111-1111-4111-8111-111111111111';

let lines = 0;

/** A fresh line id, so each test's lines are unique. */
function nextId(): string {
  lines += 1;
  return `00000000-0000-4000-8000-${String(lines).padStart(12, '0')}`;
}

interface LineFields {
  readonly id?: string;
  readonly quantity?: number;
  readonly container?: string;
  readonly carry?: object;
}

function line(item: ItemFixture, fields: LineFields = {}): object {
  const { id = nextId(), quantity = 1, ...rest } = fields;
  return { id, item: itemFixtureId(item), quantity, ...rest };
}

function stock(items: readonly object[], coins: object = {}): Inventory {
  return InventorySchema.parse({ items, coins });
}

/** The Bulk of `items`, in tenths. */
function bulkOf(items: readonly object[], coins: object = {}): LightBulk {
  return carriedBulk(stock(items, coins), content);
}

function light(count: number): LightBulk {
  return LightBulk.parse(count);
}

const WORN = { state: 'worn' };
const DROPPED = { state: 'dropped' };
const ONE_HAND = { state: 'held', hands: 1 };

/** A backpack carried as `carry`, holding an anvil and a rope. */
function packed(carry: object): readonly object[] {
  return [
    line(ItemFixture.Backpack, { id: PACK, carry }),
    line(ItemFixture.Anvil, { container: PACK }),
    line(ItemFixture.Rope, { container: PACK }),
  ];
}

/** A worn backpack holding `items`, each moved into it. */
function inWornPack(items: readonly object[]): readonly object[] {
  return [
    line(ItemFixture.Backpack, { id: PACK, carry: WORN }),
    ...items.map((each) => ({ ...each, container: PACK })),
  ];
}

/** The Bulk against Strength `modifier`, carrying `items`. */
function against(modifier: number, items: readonly object[]): InventoryBulk {
  return inventoryBulk(stock(items), content, AttributeModifier.parse(modifier));
}

function anvils(count: number): object {
  return line(ItemFixture.Anvil, { quantity: count });
}

describe('lightBulk', () => {
  test('counts negligible as 0, light as 1 and whole Bulk in tens', () => {
    expect(lightBulk(BulkWeight.Negligible)).toBe(light(0));
    expect(lightBulk(BulkWeight.Light)).toBe(light(1));
    expect(lightBulk(BulkCount.parse(3))).toBe(light(30));
  });

  test('drops the fraction for whole Bulk: 19 light items are 1 Bulk', () => {
    expect(wholeBulk(light(19))).toBe(wholeBulk(light(10)));
    expect(wholeBulk(light(9))).toBe(wholeBulk(light(0)));
  });
});

describe('carriedBulk', () => {
  test('adds items by quantity: two longswords and a rope are 2 Bulk and light', () => {
    expect(bulkOf([line(ItemFixture.Longsword, { quantity: 2 }), line(ItemFixture.Rope)])).toBe(light(21));
  });

  test('counts only whole batches, adding lines of one item first: 5 arrows and 5 more are light, 9 nothing', () => {
    const five = (): object => line(ItemFixture.Arrows, { quantity: 5 });

    expect(bulkOf([line(ItemFixture.Arrows, { quantity: 9 })])).toBe(light(0));
    expect(bulkOf([five(), five()])).toBe(light(1));
  });

  test('leaves dropped items out, with what they hold', () => {
    const items = [
      line(ItemFixture.Backpack, { id: PACK, carry: DROPPED }),
      line(ItemFixture.Anvil, { container: PACK }),
      line(ItemFixture.Longsword, { carry: DROPPED }),
    ];

    expect(bulkOf(items)).toBe(light(0));
  });

  test('weighs a container by how it is carried: a backpack is negligible worn, light stowed', () => {
    expect(bulkOf([line(ItemFixture.Backpack, { carry: WORN })])).toBe(light(0));
    expect(bulkOf([line(ItemFixture.Backpack)])).toBe(light(1));
  });

  test('ignores the first 2 Bulk in a backpack however it is carried, and counts the rest', () => {
    expect(bulkOf(packed(WORN))).toBe(light(1));
    expect(bulkOf(packed(ONE_HAND))).toBe(light(2));
  });

  test('ignores nothing in a container holding more whole Bulk than its capacity, light items dropped', () => {
    const full = inWornPack([anvils(2)]);
    const andRope = inWornPack([anvils(2), line(ItemFixture.Rope)]);
    const andSword = inWornPack([anvils(2), line(ItemFixture.Longsword)]);

    expect(bulkOf(full)).toBe(light(20));
    expect(bulkOf(andRope)).toBe(light(21));
    expect(bulkOf(andSword)).toBe(light(50));
  });

  test('weighs what a container no loaded pack has holds, ignoring none of it', () => {
    const lost = { id: PACK, item: '5b0e3c4a-0000-5000-8000-000000000000', quantity: 1 };

    expect(bulkOf([lost, line(ItemFixture.Anvil, { container: PACK })])).toBe(light(20));
  });

  test('weighs a bag of holding as itself, whatever it holds up to its capacity', () => {
    const items = [
      line(ItemFixture.BagOfHolding, { id: PACK }),
      line(ItemFixture.Anvil, { container: PACK, quantity: 3 }),
    ];

    expect(bulkOf(items)).toBe(light(10));
  });

  test('weighs an item no loaded pack has as nothing', () => {
    const lost = { id: nextId(), item: '5b0e3c4a-0000-5000-8000-000000000000', quantity: 3 };

    expect(bulkOf([lost])).toBe(light(0));
  });

  test('adds coins, 1 Bulk for every thousand of any kind', () => {
    expect(coinBulk(CoinsSchema.parse({ gp: 999 }))).toBe(light(0));
    expect(coinBulk(CoinsSchema.parse({ gp: 500, sp: 1500 }))).toBe(light(20));
    expect(bulkOf([line(ItemFixture.Rope)], { cp: 1000 })).toBe(light(11));
  });
});

describe('inventoryBulk', () => {
  test('limits at 5 and 10 plus the Strength modifier', () => {
    const bulk = against(2, [anvils(1)]);

    expect(bulk.encumberedAfter).toBe(BulkLimit.parse(7));
    expect(bulk.maximum).toBe(BulkLimit.parse(12));
    expect(bulk.encumbrance).toBe(Encumbrance.Unencumbered);
  });

  test('is encumbered carrying more than 5 plus Strength, not at it', () => {
    expect(against(1, [anvils(3)]).encumbrance).toBe(Encumbrance.Unencumbered);
    expect(against(1, [anvils(3), line(ItemFixture.Longsword)]).encumbrance).toBe(Encumbrance.Encumbered);
  });

  test('drops light Bulk before comparing: 6 Bulk and 9 light items is not past 6', () => {
    expect(against(1, [anvils(3), line(ItemFixture.Rope, { quantity: 9 })]).encumbrance).toBe(Encumbrance.Unencumbered);
  });

  test('is over its maximum carrying more than 10 plus Strength', () => {
    expect(against(0, [anvils(6)]).encumbrance).toBe(Encumbrance.OverMaximum);
    expect(against(0, [anvils(5)]).encumbrance).toBe(Encumbrance.Encumbered);
  });

  test('is encumbered past 0 Bulk at Strength -5, the lowest modifier', () => {
    expect(against(-5, []).encumberedAfter).toBe(BulkLimit.parse(0));
    expect(against(-5, [line(ItemFixture.Rope, { quantity: 9 })]).encumbrance).toBe(Encumbrance.Unencumbered);
    expect(against(-5, [line(ItemFixture.Longsword)]).encumbrance).toBe(Encumbrance.Encumbered);
  });
});
