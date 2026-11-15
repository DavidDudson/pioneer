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
  applyShiftCommand,
  ShiftCommandField,
  shiftedInventory,
  shiftFits,
  ShiftProblem,
  shiftProblem,
  SHIFTS_MAX,
  shiftsFor,
} from './weapon-shifts';
import type { ShiftReads } from './weapon-shifts';

installRulesFakes();

const ITEMS = itemFixtureContent();
const READS: ShiftReads = { items: ITEMS, runes: runeContent(itemFixtureRegistry()) };
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
function shiftsOf(inventory: Inventory): readonly ContentId[] {
  return inventory.items.flatMap((line) => shiftsFor(line, READS)).map(({ id }) => id);
}

describe('shiftFits', () => {
  const sword = ITEMS.get(itemFixtureId(ItemFixture.Longsword));

  test('a melee weapon for the same number of hands is a shape', () => {
    expect(shiftFits(sword, ITEMS.get(LONG))).toBe(true);
  });

  test('a weapon for other hands, a ranged one, and the weapon itself are not', () => {
    expect(OTHERS.map((id) => shiftFits(sword, ITEMS.get(id)))).toStrictEqual([false, false, false]);
  });

  test('something that is not a weapon is not', () => {
    const rope = ITEMS.get(itemFixtureId(ItemFixture.Rope));

    expect(shiftFits(sword, rope)).toBe(false);
  });
});

describe('shiftsFor', () => {
  test('lists the one-handed melee weapons for an item with a shifting rune, and none without one', () => {
    const shifts = shiftsOf(etched(RuneFixture.Shifting));

    expect(shifts).toContain(LONG);
    expect(shifts).not.toContain(GREAT);
    expect(shifts).not.toContain(BOW);
    expect(shiftsOf(etched())).toStrictEqual([]);
  });
});

describe('shiftProblem', () => {
  const command = { field: ShiftCommandField.ShiftWeapon, item: SWORD, shape: LONG } as const;

  test('accepts a shape of an item with a shifting rune, and dropping it', () => {
    const inventory = etched(RuneFixture.Shifting);

    expect(shiftProblem(inventory, READS, command)).toBeUndefined();
    expect(shiftProblem(inventory, READS, { field: command.field, item: SWORD })).toBeUndefined();
  });

  test('refuses an item with no shifting rune, and a shape it cannot take', () => {
    expect(shiftProblem(etched(), READS, command)).toBe(ShiftProblem.NotShifting);
    expect(shiftProblem(etched(RuneFixture.Shifting), READS, { ...command, shape: BOW })).toBe(
      ShiftProblem.NoSuchShift,
    );
  });
});

describe('applyShiftCommand', () => {
  test('sets a shape, and drops it when none is given', () => {
    const shifted = applyShiftCommand({}, { field: ShiftCommandField.ShiftWeapon, item: SWORD, shape: LONG });

    expect(shifted).toStrictEqual({ [SWORD]: LONG });
    expect(applyShiftCommand(shifted, { field: ShiftCommandField.ShiftWeapon, item: SWORD })).toStrictEqual({});
  });

  test('keeps no more than the most shifts', () => {
    const full = Object.fromEntries(
      Array.from({ length: SHIFTS_MAX }, (_unused, index) => [
        `00000000-0000-4000-8000-${String(index + 100).padStart(12, '0')}`,
        LONG,
      ]),
    );

    expect(applyShiftCommand(full, { field: ShiftCommandField.ShiftWeapon, item: SWORD, shape: LONG })).toStrictEqual(
      full,
    );
  });
});

describe('shiftedInventory', () => {
  test('makes the item the weapon of its shape, keeping its id', () => {
    const [line] = shiftedInventory(etched(RuneFixture.Shifting), { [SWORD]: LONG }, READS).items;

    expect([line?.id, line?.item]).toStrictEqual([SWORD, LONG]);
  });

  test('leaves an item with no shifting rune as it is', () => {
    const inventory = etched();

    expect(shiftedInventory(inventory, { [SWORD]: LONG }, READS)).toStrictEqual(inventory);
  });

  test('leaves out the property runes the shape cannot take, and keeps the rest', () => {
    const inventory = etched(RuneFixture.Shifting, RuneFixture.Crushing);
    const [line] = shiftedInventory(inventory, { [SWORD]: LONG }, READS).items;

    expect(line?.runes?.property.map(({ rune }) => rune)).toStrictEqual([runeFixtureId(RuneFixture.Shifting)]);
  });
});
