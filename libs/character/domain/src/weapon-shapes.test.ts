import { describe, expect, test } from 'bun:test';

import { RuneType } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';
import { installRulesFakes } from '@pioneer/rules/sdk/testing';

import { addItem, EMPTY_INVENTORY, InventoryItemId, ItemQuantity } from './inventory';
import type { Inventory } from './inventory';
import { runeContent } from './item-runes';
import { etchRune } from './rune-edits';
import {
  ItemFixture,
  itemFixtureContent,
  itemFixtureId,
  itemFixtureRegistry,
  RuneFixture,
  runeFixtureId,
} from './testing';
import {
  applyShapeCommand,
  ShapeCommandField,
  shapedInventory,
  shapeFits,
  ShapeProblem,
  shapeProblem,
  SHAPES_MAX,
  shapesFor,
} from './weapon-shapes';
import type { ShapeReads } from './weapon-shapes';

installRulesFakes();
const ITEMS = itemFixtureContent();
const READS: ShapeReads = { items: ITEMS, runes: runeContent(itemFixtureRegistry()) };
const SWORD = InventoryItemId.parse('00000000-0000-4000-8000-000000000001');
const LONG = itemFixtureId(ItemFixture.LongSword);
const GREAT = itemFixtureId(ItemFixture.Greatsword);
const BOW = itemFixtureId(ItemFixture.Shortbow);
/** Not shapes of a longsword: a two-handed weapon, a ranged one, and the longsword itself. */
const OTHERS = [GREAT, BOW, itemFixtureId(ItemFixture.Longsword)];

/** A longsword etched with `runes`. */
function etched(...runes: readonly RuneFixture[]): Inventory {
  const stocked = addItem(EMPTY_INVENTORY, {
    id: SWORD,
    item: itemFixtureId(ItemFixture.Longsword),
    quantity: ItemQuantity.parse(1),
    container: undefined,
  });
  let stock = stocked;
  for (const rune of runes) {
    stock = etchRune(stock, SWORD, { type: RuneType.Property, rune: runeFixtureId(rune) });
  }
  return stock;
}

/** The content ids of the shapes the items of `inventory` can take. */
function shapesOf(inventory: Inventory): readonly ContentId[] {
  return inventory.items.flatMap((line) => shapesFor(line, READS)).map(({ id }) => id);
}

describe('shapeFits', () => {
  const sword = ITEMS.get(itemFixtureId(ItemFixture.Longsword));

  test('a melee weapon for the same number of hands is a shape', () => {
    expect(shapeFits(sword, ITEMS.get(LONG))).toBe(true);
  });

  test('a weapon for other hands, a ranged one, and the weapon itself are not', () => {
    expect(OTHERS.map((id) => shapeFits(sword, ITEMS.get(id)))).toStrictEqual([false, false, false]);
  });

  test('something that is not a weapon is not', () => {
    const rope = ITEMS.get(itemFixtureId(ItemFixture.Rope));

    expect(shapeFits(sword, rope)).toBe(false);
  });
});

describe('shapesFor', () => {
  test('lists the one-handed melee weapons for an item with a shifting rune, and none without one', () => {
    const shapes = shapesOf(etched(RuneFixture.Shifting));

    expect(shapes).toContain(LONG);
    expect(shapes).not.toContain(GREAT);
    expect(shapes).not.toContain(BOW);
    expect(shapesOf(etched())).toStrictEqual([]);
  });
});

describe('shapeProblem', () => {
  const command = { field: ShapeCommandField.ShiftWeapon, item: SWORD, shape: LONG } as const;

  test('accepts a shape of an item with a shifting rune, and dropping it', () => {
    const inventory = etched(RuneFixture.Shifting);

    expect(shapeProblem(inventory, READS, command)).toBeUndefined();
    expect(shapeProblem(inventory, READS, { field: command.field, item: SWORD })).toBeUndefined();
  });

  test('refuses an item with no shifting rune, and a shape it cannot take', () => {
    expect(shapeProblem(etched(), READS, command)).toBe(ShapeProblem.NotShifting);
    expect(shapeProblem(etched(RuneFixture.Shifting), READS, { ...command, shape: BOW })).toBe(
      ShapeProblem.NoSuchShape,
    );
  });
});

describe('applyShapeCommand', () => {
  test('sets a shape, and drops it when none is given', () => {
    const shaped = applyShapeCommand({}, { field: ShapeCommandField.ShiftWeapon, item: SWORD, shape: LONG });

    expect(shaped).toStrictEqual({ [SWORD]: LONG });
    expect(applyShapeCommand(shaped, { field: ShapeCommandField.ShiftWeapon, item: SWORD })).toStrictEqual({});
  });

  test('keeps no more than the most shapes', () => {
    const full = Object.fromEntries(
      Array.from({ length: SHAPES_MAX }, (_unused, index) => [
        `00000000-0000-4000-8000-${String(index + 100).padStart(12, '0')}`,
        LONG,
      ]),
    );

    expect(applyShapeCommand(full, { field: ShapeCommandField.ShiftWeapon, item: SWORD, shape: LONG })).toStrictEqual(
      full,
    );
  });
});

describe('shapedInventory', () => {
  test('makes the item the weapon of its shape, keeping its id', () => {
    const [line] = shapedInventory(etched(RuneFixture.Shifting), { [SWORD]: LONG }, READS).items;

    expect([line?.id, line?.item]).toStrictEqual([SWORD, LONG]);
  });

  test('leaves an item with no shifting rune as it is', () => {
    const inventory = etched();

    expect(shapedInventory(inventory, { [SWORD]: LONG }, READS)).toStrictEqual(inventory);
  });

  test('leaves out the property runes the shape cannot take, and keeps the rest', () => {
    const inventory = etched(RuneFixture.Shifting, RuneFixture.Crushing);
    const [line] = shapedInventory(inventory, { [SWORD]: LONG }, READS).items;

    expect(line?.runes?.property.map(({ rune }) => rune)).toStrictEqual([runeFixtureId(RuneFixture.Shifting)]);
  });
});
