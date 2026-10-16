import { describe, expect, test } from 'bun:test';

import { PROPERTY_RUNES_MAX } from '@pioneer/rules/sdk';

import {
  addItem,
  carryItem,
  EMPTY_INVENTORY,
  InventoryItemId,
  inventoryRefusal,
  InventoryRefusalField,
  InventorySchema,
  investItem,
  ItemQuantity,
} from './inventory';
import type { Inventory, InventoryItem } from './inventory';
import { CarryState, Hands, HANDS_MAX, INVESTED_MAX, STOWED } from './item-carry';
import { ItemOrigin } from './item-origin';
import { inventoryViolations, RuleBreak } from './rule-violations';
import {
  ItemFixture,
  itemFixtureContent,
  itemFixtureId,
  RuneFixture,
  runeFixtureContent,
  propertyRune,
} from './testing';

const content = { items: itemFixtureContent(), runes: runeFixtureContent() };
const one = ItemQuantity.parse(1);
const TWO_HANDS = { state: CarryState.Held, hands: Hands.parse(2) } as const;

function idAt(index: number): InventoryItemId {
  return InventoryItemId.parse(`00000000-0000-4000-8000-${String(index).padStart(12, '0')}`);
}

/** `count` rope lines, each given `change`. */
function ropes(
  count: number,
  change: (item: InventoryItem, index: number) => InventoryItem = (item) => item,
): Inventory {
  let inventory = EMPTY_INVENTORY;
  for (let index = 0; index < count; index += 1) {
    inventory = addItem(inventory, {
      id: idAt(index),
      item: itemFixtureId(ItemFixture.Rope),
      quantity: one,
      container: undefined,
    });
  }
  return { ...inventory, items: inventory.items.map(change) };
}

const imported = (item: InventoryItem): InventoryItem => ({
  ...item,
  origin: ItemOrigin.Import,
});

describe('InventorySchema: origin', () => {
  test('refuses a player line past the invested limit', () => {
    const over = ropes(INVESTED_MAX + 1, (item) => ({
      ...item,
      invested: true,
    }));
    expect(InventorySchema.safeParse(over).success).toBe(false);
  });

  test('keeps an imported line past the invested limit', () => {
    const over = ropes(INVESTED_MAX + 1, (item) => imported({ ...item, invested: true }));
    expect(InventorySchema.parse(over).items).toHaveLength(INVESTED_MAX + 1);
  });

  test('keeps imported lines holding more than two hands hold', () => {
    const over = ropes(HANDS_MAX + 1, (item) =>
      imported({
        ...item,
        carry: { state: CarryState.Held, hands: Hands.parse(1) },
      }),
    );
    expect(InventorySchema.safeParse(over).success).toBe(true);
  });

  test('refuses a player line past the property rune cap, and keeps an imported one', () => {
    const runes = Object.values(RuneFixture).map((each) => propertyRune(each).rune);
    expect(runes.length).toBeGreaterThan(PROPERTY_RUNES_MAX);
    const withRunes = (item: InventoryItem): InventoryItem => ({
      ...item,
      runes: { property: runes },
    });
    expect(InventorySchema.safeParse(ropes(1, withRunes)).success).toBe(false);
    expect(InventorySchema.safeParse(ropes(1, (item) => imported(withRunes(item)))).success).toBe(true);
  });

  test("reads a line with no origin as the player's", () => {
    expect(InventorySchema.parse(ropes(1)).items[0]).not.toHaveProperty('origin');
  });
});

describe('an imported inventory past the limits', () => {
  const over = ropes(INVESTED_MAX + 1, (item) => imported({ ...item, invested: true, carry: STOWED }));

  test('is reported by inventoryViolations', () => {
    expect(inventoryViolations(over, content)).toStrictEqual([
      {
        item: idAt(INVESTED_MAX),
        rule: RuleBreak.Invested,
        limit: INVESTED_MAX,
        actual: INVESTED_MAX + 1,
      },
    ]);
  });

  test('refuses an edit that invests one more', () => {
    const spare = addItem(over, {
      id: idAt(99),
      item: itemFixtureId(ItemFixture.Rope),
      quantity: one,
      container: undefined,
    });
    expect(inventoryRefusal(spare, { id: idAt(99), invested: true })).toMatchObject({
      field: InventoryRefusalField.Invested,
    });
  });

  test('lets an edit take investment off, which clears the violation', () => {
    expect(inventoryRefusal(over, { id: idAt(INVESTED_MAX), invested: false })).toBe(undefined);
    const fixed = investItem(over, idAt(INVESTED_MAX), false);
    expect(inventoryViolations(fixed, content)).toStrictEqual([]);
  });

  test('refuses holding more once the hands are full', () => {
    const held = carryItem(over, idAt(0), TWO_HANDS);
    expect(
      inventoryRefusal(held, {
        id: idAt(1),
        carry: { state: CarryState.Held, hands: Hands.parse(1) },
      }),
    ).toMatchObject({ field: InventoryRefusalField.Carry });
  });
});
