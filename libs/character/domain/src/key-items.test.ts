import { describe, expect, test } from 'bun:test';

import { CharacterPatchField } from './character-patch';
import {
  addItem,
  carryItem,
  EMPTY_INVENTORY,
  InventoryItemId,
  InventoryItemName,
  InventoryRefusalField,
  InventorySchema,
  investItem,
  ItemQuantity,
} from './inventory';
import type { Inventory } from './inventory';
import { CarryState, Hands, INVESTED_MAX } from './item-carry';
import { KeyItemId } from './key-item-id';
import { keyItemLine, keyItemRefusal, withKeyItem, withKeyLink, withoutKeyItem } from './key-items';
import { inventoryViolations } from './rule-violations';
import { ItemFixture, itemFixtureContent, itemFixtureId, runeFixtureContent } from './testing';

const content = { items: itemFixtureContent(), runes: runeFixtureContent() };
const one = ItemQuantity.parse(1);
const caliburn = KeyItemId.parse('00000000-0000-4000-9000-000000000001');
const TWO_HANDS = { state: CarryState.Held, hands: Hands.parse(2) } as const;

function idAt(index: number): InventoryItemId {
  return InventoryItemId.parse(`00000000-0000-4000-8000-${String(index).padStart(12, '0')}`);
}

function given(inventory: Inventory = EMPTY_INVENTORY): Inventory {
  return withKeyItem(inventory, {
    id: idAt(99),
    keyItem: caliburn,
    item: itemFixtureId(ItemFixture.Rope),
    quantity: one,
    name: InventoryItemName.parse('Caliburn'),
    runes: undefined,
  });
}

describe('key items in an inventory', () => {
  test('a given line is stowed and linked to its key item', () => {
    const line = keyItemLine(given(), caliburn);
    expect(line?.id).toBe(idAt(99));
    expect(line?.carry.state).toBe(CarryState.Stowed);
  });

  test('taking it back removes the line and leaves the rest', () => {
    const inventory = addItem(given(), {
      id: idAt(1),
      item: itemFixtureId(ItemFixture.Rope),
      quantity: one,
      container: undefined,
    });
    const after = withoutKeyItem(inventory, caliburn);
    expect(after.items.map((each) => each.id)).toStrictEqual([idAt(1)]);
    expect(withoutKeyItem(after, caliburn)).toBe(after);
  });

  test('what a taken-back container held comes out loose', () => {
    const held = addItem(given(), {
      id: idAt(1),
      item: itemFixtureId(ItemFixture.Rope),
      quantity: one,
      container: idAt(99),
    });
    const [rope] = withoutKeyItem(held, caliburn).items;
    expect(rope?.container).toBeUndefined();
  });

  test('is kept past the invested limit the schema holds a player to', () => {
    let inventory = EMPTY_INVENTORY;
    for (let index = 0; index < INVESTED_MAX + 1; index += 1) {
      inventory = withKeyItem(inventory, {
        id: idAt(index),
        keyItem: KeyItemId.parse(`00000000-0000-4000-9000-${String(index).padStart(12, '0')}`),
        item: itemFixtureId(ItemFixture.Rope),
        quantity: one,
        name: InventoryItemName.parse('Caliburn'),
        runes: undefined,
      });
    }
    for (const each of inventory.items) {
      inventory = investItem(inventory, each.id, true);
    }
    expect(InventorySchema.safeParse(inventory).success).toBe(true);
  });

  test('breaks no rule however it is held', () => {
    const crowded = carryItem(given(), idAt(99), TWO_HANDS);
    const held = addItem(crowded, {
      id: idAt(1),
      item: itemFixtureId(ItemFixture.Rope),
      quantity: one,
      container: undefined,
    });
    const both = carryItem(held, idAt(1), TWO_HANDS);
    const violations = inventoryViolations(both, content);
    expect(violations.some((each) => each.item === idAt(99))).toBe(false);
    expect(violations.some((each) => each.item === idAt(1))).toBe(true);
  });
});

describe('keyItemRefusal', () => {
  const inventory = given();

  test('refuses removing or selling the line', () => {
    const refusal = keyItemRefusal(inventory, { field: CharacterPatchField.RemoveItem, id: idAt(99) });
    expect(refusal?.field).toBe(InventoryRefusalField.Id);
    expect(refusal?.message.key).toBe('character.validation.keyItemLocked');
  });

  test('refuses changing how many it holds', () => {
    const patch = {
      field: CharacterPatchField.SetItemQuantity,
      id: idAt(99),
      quantity: ItemQuantity.parse(2),
    } as const;
    expect(keyItemRefusal(inventory, patch)).toBeDefined();
  });

  test('lets the player carry and rename it', () => {
    expect(
      keyItemRefusal(inventory, { field: CharacterPatchField.CarryItem, id: idAt(99), carry: TWO_HANDS }),
    ).toBeUndefined();
    expect(
      keyItemRefusal(inventory, { field: CharacterPatchField.RenameItem, id: idAt(99), name: undefined }),
    ).toBeUndefined();
  });

  test('lets the player remove an everyday line', () => {
    const everyday = addItem(inventory, {
      id: idAt(1),
      item: itemFixtureId(ItemFixture.Rope),
      quantity: one,
      container: undefined,
    });
    expect(keyItemRefusal(everyday, { field: CharacterPatchField.RemoveItem, id: idAt(1) })).toBeUndefined();
  });
});

describe('withKeyLink', () => {
  const rope = { id: idAt(1), item: itemFixtureId(ItemFixture.Rope), quantity: one, container: undefined };

  test('links the existing line to the key item and adds none', () => {
    const first = investItem(addItem(EMPTY_INVENTORY, rope), idAt(1));
    const stuffed = investItem(addItem(first, { ...rope, id: idAt(2) }), idAt(2));
    const linked = withKeyLink(stuffed, idAt(2), caliburn);

    expect(linked.items).toHaveLength(2);
    expect(keyItemLine(linked, caliburn)?.id).toBe(idAt(2));
    expect(keyItemLine(stuffed, caliburn)).toBeUndefined();
  });

  test('leaves every other line as it was', () => {
    const held = addItem(addItem(EMPTY_INVENTORY, rope), { ...rope, id: idAt(2) });
    const linked = withKeyLink(held, idAt(2), caliburn);

    expect(linked.items[0]).toStrictEqual(held.items[0]);
  });
});
