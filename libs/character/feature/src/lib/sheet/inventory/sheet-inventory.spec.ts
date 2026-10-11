import {
  addItem,
  carryItem,
  CarryState,
  EMPTY_INVENTORY,
  InventoryItemId,
  InventoryItemName,
  investItem,
  ItemQuantity,
  ONE_HAND,
} from '@pioneer/character/domain';
import type { Inventory } from '@pioneer/character/domain';
import { ItemFixture, itemFixtureContent, itemFixtureId } from '@pioneer/character/domain/testing';
import { describe, expect, it } from 'vitest';

import { containerOptions, itemOptions, sheetInventory } from './sheet-inventory';

const content = itemFixtureContent();
const one = ItemQuantity.parse(1);
const backpack = InventoryItemId.parse('11111111-1111-4111-8111-111111111111');
const pouch = InventoryItemId.parse('22222222-2222-4222-8222-222222222222');
const rope = InventoryItemId.parse('33333333-3333-4333-8333-333333333333');
const sword = InventoryItemId.parse('44444444-4444-4444-8444-444444444444');
const diamond = InventoryItemId.parse('55555555-5555-4555-8555-555555555555');

const compare = (left: string, right: string): number => left.localeCompare(right);

function present<TValue>(value: TValue | undefined): TValue {
  if (value === undefined) {
    throw new Error('Expected a value');
  }
  return value;
}

/** Gives each line's id, so lines are added in the order listed. */
function stock(lines: readonly [InventoryItemId, ItemFixture, InventoryItemId | undefined][]): Inventory {
  let inventory = EMPTY_INVENTORY;
  for (const [id, name, container] of lines) {
    inventory = addItem(inventory, { id, item: itemFixtureId(name), quantity: one, container });
  }
  return inventory;
}

/** A worn backpack holding a second backpack (the pouch) holding a rope, a sword in hand and a loose diamond. */
const PACKED = carryItem(
  carryItem(
    stock([
      [diamond, ItemFixture.Diamond, undefined],
      [backpack, ItemFixture.Backpack, undefined],
      [pouch, ItemFixture.Backpack, backpack],
      [rope, ItemFixture.Rope, pouch],
      [sword, ItemFixture.Longsword, undefined],
    ]),
    backpack,
    { state: CarryState.Worn },
  ),
  sword,
  { state: CarryState.Held, hands: ONE_HAND },
);

describe(sheetInventory, () => {
  it('groups loose items worn, held then stowed, leaving out empty groups', () => {
    const groups = sheetInventory(PACKED, content);
    expect(groups.map(({ placement, lines }) => [placement, lines.map((line) => line.id)])).toStrictEqual([
      ['worn', [backpack]],
      ['held', [sword]],
      ['stowed', [diamond]],
    ]);
    expect(sheetInventory(EMPTY_INVENTORY, content)).toStrictEqual([]);
  });

  it('groups a dropped item last, and notes the hands a held one takes and an investment', () => {
    const dropped = investItem(carryItem(PACKED, diamond, { state: CarryState.Dropped }), backpack, true);
    const groups = sheetInventory(dropped, content);
    expect(groups.map(({ placement }) => placement)).toStrictEqual(['worn', 'held', 'dropped']);
    expect(groups[1]?.lines[0]).toMatchObject({ id: sword, hands: 1, invested: false });
    expect(groups[0]?.lines[0]).toMatchObject({ id: backpack, hands: undefined, invested: true });
  });

  it('puts what a container holds beneath it, however deep', () => {
    const worn = present(sheetInventory(PACKED, content)[0]);
    const pack = present(worn.lines[0]);
    expect(pack.contents.map((line) => line.id)).toStrictEqual([pouch]);
    expect(present(pack.contents[0]).contents.map((line) => [line.id, line.name, line.bulk])).toStrictEqual([
      [rope, 'Rope', 'light'],
    ]);
  });

  it('shows the player’s name with the content’s beside it', () => {
    const named = stock([[sword, ItemFixture.Longsword, undefined]]);
    const [item] = named.items;
    const renamed = { ...named, items: [{ ...present(item), name: InventoryItemName.parse('Oathkeeper') }] };
    const [held] = sheetInventory(renamed, content);
    expect(present(held).lines[0]).toMatchObject({ name: 'Oathkeeper', contentName: 'Longsword' });
  });
});

describe(containerOptions, () => {
  it('offers every container for a new item', () => {
    expect(containerOptions(PACKED, content, undefined).map((option) => option.value)).toStrictEqual([backpack, pouch]);
  });

  it('never offers a container a place inside itself or what it holds', () => {
    expect(containerOptions(PACKED, content, backpack)).toStrictEqual([]);
    expect(containerOptions(PACKED, content, rope).map((option) => option.value)).toStrictEqual([backpack, pouch]);
  });
});

describe(itemOptions, () => {
  it('matches names containing the query, ignoring case, by name', () => {
    expect(itemOptions(content, 'ARM', compare).map((option) => option.label)).toStrictEqual([
      'Hide-armor',
      'Leather-armor',
      'Rune-armor',
    ]);
    expect(itemOptions(content, 'ro', compare).map((option) => option.label)).toStrictEqual(['Arrows', 'Rope']);
  });
});
