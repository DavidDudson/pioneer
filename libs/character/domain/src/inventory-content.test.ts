import { describe, expect, test } from 'bun:test';

import { ContentId, ItemState } from '@pioneer/rules/sdk';

import { addItem, carryItem, EMPTY_INVENTORY, InventoryItemId, InventoryRefusalField, ItemQuantity } from './inventory';
import type { Inventory, InventoryItem } from './inventory';
import { activeState, handsNeeded, isContainer, itemRefusal } from './inventory-content';
import type { ItemEntry } from './inventory-content';
import { CarryState, Hands, ONE_HAND, STOWED } from './item-carry';
import type { Carry } from './item-carry';
import { ItemFixture, itemFixtureContent, itemFixtureId } from './testing';

const content = itemFixtureContent();
const backpackId = InventoryItemId.parse('11111111-1111-4111-8111-111111111111');
const ropeId = InventoryItemId.parse('33333333-3333-4333-8333-333333333333');
const one = ItemQuantity.parse(1);

function entry(name: ItemFixture): ItemEntry | undefined {
  return content.get(itemFixtureId(name));
}

/** A loose backpack and a loose rope. */
const withBackpack = addItem(EMPTY_INVENTORY, {
  id: backpackId,
  item: itemFixtureId(ItemFixture.Backpack),
  quantity: one,
  container: undefined,
});
const carried: Inventory = addItem(withBackpack, {
  id: ropeId,
  item: itemFixtureId(ItemFixture.Rope),
  quantity: one,
  container: undefined,
});

describe('itemContent', () => {
  test('holds every carried kind', () => {
    expect(content.size).toBe(Object.keys(ItemFixture).length);
  });
});

describe('isContainer', () => {
  test('is equipment with a capacity', () => {
    expect(isContainer(entry(ItemFixture.Backpack))).toBe(true);
    expect(isContainer(entry(ItemFixture.Rope))).toBe(false);
    expect(isContainer(entry(ItemFixture.LeatherArmor))).toBe(false);
    expect(isContainer(undefined)).toBe(false);
  });
});

describe('itemRefusal', () => {
  test('allows a carried item into a container', () => {
    expect(itemRefusal(content, carried, { item: itemFixtureId(ItemFixture.Rope), container: backpackId })).toBe(
      undefined,
    );
  });

  test('refuses content no pack has', () => {
    const unknown = ContentId.parse('5b0e3c4a-0000-5000-8000-000000000000');
    expect(itemRefusal(content, carried, { item: unknown })).toMatchObject({
      field: InventoryRefusalField.Item,
      message: { key: 'character.validation.unknownItem' },
    });
  });

  test('refuses stowing in an item that holds nothing', () => {
    expect(itemRefusal(content, carried, { container: ropeId })).toMatchObject({
      field: InventoryRefusalField.Container,
      message: { key: 'character.validation.notAContainer' },
    });
  });
});

const armorId = InventoryItemId.parse('44444444-4444-4444-8444-444444444444');
const hideId = InventoryItemId.parse('55555555-5555-4555-8555-555555555555');
const greatswordId = InventoryItemId.parse('66666666-6666-4666-8666-666666666666');
const cloakId = InventoryItemId.parse('77777777-7777-4777-8777-777777777777');
const ONE = ONE_HAND;
const TWO = Hands.parse(2);
const WORN: Carry = { state: CarryState.Worn };

/** `carried` with leather and hide armour, a greatsword and a cloak, all stowed loose. */
const KIT: readonly (readonly [InventoryItemId, ItemFixture])[] = [
  [armorId, ItemFixture.LeatherArmor],
  [hideId, ItemFixture.HideArmor],
  [greatswordId, ItemFixture.Greatsword],
  [cloakId, ItemFixture.Cloak],
];

/** `carried` with leather and hide armour, a greatsword and a cloak, all stowed loose. */
function kitted(): Inventory {
  let stock = carried;
  for (const [id, name] of KIT) {
    stock = addItem(stock, { id, item: itemFixtureId(name), quantity: one, container: undefined });
  }
  return stock;
}
const kit = kitted();
describe('itemRefusal: carrying', () => {
  test('wears armour and worn items, and holds anything', () => {
    expect(itemRefusal(content, kit, { id: armorId, carry: WORN })).toBe(undefined);
    expect(itemRefusal(content, kit, { id: cloakId, carry: WORN })).toBe(undefined);
    expect(itemRefusal(content, kit, { id: ropeId, carry: { state: CarryState.Held, hands: ONE } })).toBe(undefined);
    expect(itemRefusal(content, kit, { id: ropeId, carry: { state: CarryState.Dropped } })).toBe(undefined);
  });

  test('refuses wearing what is not worn', () => {
    expect(itemRefusal(content, kit, { id: greatswordId, carry: WORN })).toMatchObject({
      field: InventoryRefusalField.Carry,
      message: { key: 'character.validation.notWearable' },
    });
  });

  test('refuses a second suit of armour', () => {
    const wearing = carryItem(kit, armorId, WORN);
    expect(itemRefusal(content, wearing, { id: hideId, carry: WORN })).toMatchObject({
      field: InventoryRefusalField.Carry,
      message: { key: 'character.validation.armorWorn' },
    });
    expect(itemRefusal(content, wearing, { id: armorId, carry: WORN })).toBe(undefined);
  });

  test('refuses a two-handed item held in one hand', () => {
    expect(
      itemRefusal(content, kit, { id: greatswordId, carry: { state: CarryState.Held, hands: ONE } }),
    ).toMatchObject({ field: InventoryRefusalField.Carry, message: { key: 'character.validation.needsTwoHands' } });
    expect(itemRefusal(content, kit, { id: greatswordId, carry: { state: CarryState.Held, hands: TWO } })).toBe(
      undefined,
    );
  });
});

describe('itemRefusal: investing', () => {
  test('invests an item with the invested trait', () => {
    expect(itemRefusal(content, kit, { id: cloakId, invested: true })).toBe(undefined);
  });

  test('refuses investing an item without it, but always allows taking investment off', () => {
    expect(itemRefusal(content, kit, { id: armorId, invested: true })).toMatchObject({
      field: InventoryRefusalField.Invested,
      message: { key: 'character.validation.notInvestable' },
    });
    expect(itemRefusal(content, kit, { id: armorId, invested: false })).toBe(undefined);
  });
});

describe('handsNeeded', () => {
  test('is two for an item held in two hands, else one', () => {
    expect(handsNeeded(entry(ItemFixture.Greatsword))).toBe(TWO);
    expect(handsNeeded(entry(ItemFixture.Longsword))).toBe(ONE);
    expect(handsNeeded(entry(ItemFixture.Rope))).toBe(ONE);
    expect(handsNeeded(undefined)).toBe(ONE);
  });
});

function line(name: ItemFixture, carry: Carry, invested?: true): InventoryItem {
  return {
    id: ropeId,
    item: itemFixtureId(name),
    quantity: one,
    carry,
    ...(invested === undefined ? {} : { invested }),
  };
}

function held(hands: Hands): Carry {
  return { state: CarryState.Held, hands };
}

/** How the fixture `name` works carried as `carry`. */
function worksAs(name: ItemFixture, carry: Carry, invested?: true): ItemState | undefined {
  return activeState(line(name, carry, invested), entry(name));
}

describe('activeState', () => {
  test.each<[ItemFixture, Carry, ItemState | undefined]>([
    [ItemFixture.LeatherArmor, WORN, ItemState.Worn],
    [ItemFixture.LeatherArmor, held(ONE), undefined],
    [ItemFixture.SteelShield, held(ONE), ItemState.Held],
    [ItemFixture.Longsword, held(ONE), ItemState.Held],
    [ItemFixture.Greatsword, held(ONE), undefined],
    [ItemFixture.Greatsword, held(TWO), ItemState.Held],
    [ItemFixture.Backpack, WORN, ItemState.Worn],
    [ItemFixture.Rope, held(ONE), ItemState.Held],
    [ItemFixture.Longsword, STOWED, undefined],
    [ItemFixture.Longsword, { state: CarryState.Dropped }, undefined],
  ])('%s carried %o works as %s', (name, carry, state) => {
    expect(worksAs(name, carry)).toBe(state);
  });

  test('an invested-trait item works only while invested and worn', () => {
    expect(worksAs(ItemFixture.Cloak, WORN)).toBe(undefined);
    expect(worksAs(ItemFixture.Cloak, WORN, true)).toBe(ItemState.Invested);
    expect(worksAs(ItemFixture.Cloak, STOWED, true)).toBe(undefined);
  });

  test('content no pack has does nothing', () => {
    const longsword = line(ItemFixture.Longsword, held(ONE));
    expect(activeState(longsword, undefined)).toBe(undefined);
  });
});
