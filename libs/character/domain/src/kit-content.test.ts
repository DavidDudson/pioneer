import { describe, expect, test } from 'bun:test';

import { ContentId, ContentRegistry } from '@pioneer/rules/sdk';
import type { KitData } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import { newId } from '@pioneer/shared/kernel';

import { EMPTY_INVENTORY, INVENTORY_ITEMS_MAX, InventoryItemId, ItemQuantity } from './inventory';
import type { Inventory, InventoryItem } from './inventory';
import { STOWED } from './item-carry';
import { kitContent, kitItems, kitRefusal } from './kit-content';
import {
  ItemFixture,
  itemFixtureContent,
  itemFixtureId,
  KitFixture,
  kitFixtureContent,
  kitFixtureId,
} from './testing/item-content';

const reads = { kits: kitFixtureContent(), items: itemFixtureContent() };
const explorer = kitFixtureId(KitFixture.Explorer);

/** Fresh ids, handed out one per call; eight cover any fixture kit. */
function sequentialIds(): () => InventoryItemId {
  const ids = Array.from({ length: 8 }, () => InventoryItemId.parse(newId()));
  let next = 0;
  return () => {
    const id = ids[next];
    next += 1;
    if (id === undefined) {
      throw new Error('Out of ids');
    }
    return id;
  };
}

function explorerData(): KitData {
  const entry = reads.kits.get(explorer);
  if (entry === undefined) {
    throw new Error('Expected the explorer kit');
  }
  return entry.data;
}

describe('kitContent', () => {
  test('holds the loaded kits, and no items', () => {
    expect([...reads.kits.keys()].toSorted()).toStrictEqual(
      [explorer, kitFixtureId(KitFixture.Keepsake)].toSorted(),
    );
    expect(reads.kits.has(itemFixtureId(ItemFixture.Backpack))).toBe(false);
  });
});

describe('kitItems', () => {
  test('expands a kit into its items, what a container holds inside it', () => {
    const ids = sequentialIds();
    const lines = kitItems(explorerData(), undefined, ids);
    const [backpack, rope, arrows, sword] = lines.map((line) => line.id);
    expect(lines).toStrictEqual([
      { id: backpack, item: itemFixtureId(ItemFixture.Backpack), quantity: ItemQuantity.parse(1), container: undefined },
      { id: rope, item: itemFixtureId(ItemFixture.Rope), quantity: ItemQuantity.parse(1), container: backpack },
      { id: arrows, item: itemFixtureId(ItemFixture.Arrows), quantity: ItemQuantity.parse(10), container: backpack },
      { id: sword, item: itemFixtureId(ItemFixture.Longsword), quantity: ItemQuantity.parse(1), container: undefined },
    ]);
  });

  test('stows what the kit holds in the container given', () => {
    const bag = InventoryItemId.parse(newId());
    const lines = kitItems(explorerData(), bag, sequentialIds());
    const [backpack] = lines;
    expect(lines.filter((line) => line.container === bag).map((line) => line.item)).toStrictEqual([
      itemFixtureId(ItemFixture.Backpack),
      itemFixtureId(ItemFixture.Longsword),
    ]);
    expect(lines.filter((line) => line.container === backpack?.id)).toHaveLength(2);
  });
});

/** An inventory of `count` diamonds, loose. */
function holding(count: number): Inventory {
  const item = itemFixtureId(ItemFixture.Diamond);
  const items = Array.from(
    { length: count },
    (): InventoryItem => ({ id: InventoryItemId.parse(newId()), item, quantity: ItemQuantity.parse(1), carry: STOWED }),
  );
  return { ...EMPTY_INVENTORY, items };
}

describe('kitRefusal', () => {
  test('allows a loaded kit whose items are all loaded', () => {
    expect(kitRefusal(reads, EMPTY_INVENTORY, explorer)).toBe(undefined);
  });

  test('refuses a kit no loaded pack has', () => {
    expect(kitRefusal(reads, EMPTY_INVENTORY, ContentId.parse(newId()))).toStrictEqual({
      field: 'kit',
      message: { key: 'character.validation.unknownKit' },
    });
  });

  test('refuses a kit holding an item no loaded pack has, even inside a container', () => {
    const backpack = itemFixtureId(ItemFixture.Backpack);
    const lost = ContentId.parse(newId());
    const pack = new ContentPackBuilder()
      .withId('lost-kits')
      .withKit('lost', { items: [{ item: backpack, quantity: 1, contents: [{ item: lost, quantity: 1 }] }] })
      .build();
    const registry = new ContentRegistry();
    registry.register(pack);
    const kits = kitContent(registry);
    const [kit] = kits.keys();
    expect(kit).toBeDefined();
    expect(kitRefusal({ kits, items: reads.items }, EMPTY_INVENTORY, kit ?? lost)).toStrictEqual({
      field: 'kit',
      message: { key: 'character.validation.unknownKitItem' },
    });
  });

  test('refuses a kit whose items would take the inventory past its limit', () => {
    // The explorer kit is four lines.
    expect(kitRefusal(reads, holding(INVENTORY_ITEMS_MAX - 4), explorer)).toBe(undefined);
    expect(kitRefusal(reads, holding(INVENTORY_ITEMS_MAX - 3), explorer)).toStrictEqual({
      field: 'kit',
      message: { key: 'character.validation.inventoryFull', params: { maximum: INVENTORY_ITEMS_MAX } },
    });
  });
});
