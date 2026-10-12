import { describe, expect, test } from 'bun:test';

import { ContentId, ContentRegistry } from '@pioneer/rules/sdk';
import type { KitData } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import { newId } from '@pioneer/shared/kernel';

import { EMPTY_INVENTORY, INVENTORY_ITEMS_MAX, InventoryItemId, ItemQuantity } from './inventory';
import type { Inventory, InventoryItem } from './inventory';
import { STOWED } from './item-carry';
import { isKitAddable, kitContent, kitItems, kitRefusal } from './kit-content';
import type { KitEntry, KitReads } from './kit-content';
import { ItemFixture, itemFixtureContent, itemFixtureId } from './testing/item-content';
import { KitFixture, kitFixtureContent, kitFixtureId } from './testing/kit-fixtures';

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
      [explorer, kitFixtureId(KitFixture.Keepsake), kitFixtureId(KitFixture.Smithy)].toSorted(),
    );
    expect(reads.kits.has(itemFixtureId(ItemFixture.Backpack))).toBe(false);
  });
});

describe('kitItems', () => {
  test('expands a kit into its items, what a container holds inside it', () => {
    const lines = kitItems(explorerData(), undefined, sequentialIds());
    const [backpack] = lines;
    expect(lines.map(({ item, quantity, container }) => [item, Number(quantity), container])).toStrictEqual([
      [itemFixtureId(ItemFixture.Backpack), 1, undefined],
      [itemFixtureId(ItemFixture.Rope), 1, backpack?.id],
      [itemFixtureId(ItemFixture.Arrows), 10, backpack?.id],
      [itemFixtureId(ItemFixture.Longsword), 1, undefined],
    ]);
    expect(new Set(lines.map((line) => line.id)).size).toBe(lines.length);
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
  const items = Array.from({ length: count }, (): InventoryItem => ({
    id: InventoryItemId.parse(newId()),
    item,
    quantity: ItemQuantity.parse(1),
    carry: STOWED,
  }));
  return { ...EMPTY_INVENTORY, items };
}

/** The one kit of a pack holding `items`. */
function oneKit(items: readonly object[]): KitEntry {
  const registry = new ContentRegistry();
  registry.register(new ContentPackBuilder().withId('odd-kits').withKit('odd', { items }).build());
  const [kit] = kitContent(registry).values();
  if (kit === undefined) {
    throw new Error('Expected the kit');
  }
  return kit;
}

/** The fixture items, and `kit` as the only kit. */
function readsWith(kit: KitEntry): KitReads {
  return { kits: new Map([[kit.id, kit]]), items: reads.items };
}

describe('kitRefusal', () => {
  test('allows a loaded kit whose items are all loaded', () => {
    expect(kitRefusal(reads, EMPTY_INVENTORY, explorer)).toBe(undefined);
  });

  test('refuses a kit no loaded pack has', () => {
    const unknown = ContentId.parse(newId());
    expect(kitRefusal(reads, EMPTY_INVENTORY, unknown)).toStrictEqual({
      field: 'kit',
      message: { key: 'character.validation.unknownKit' },
    });
  });

  test('refuses a kit holding an item no loaded pack has, even inside a container', () => {
    const lost = { item: ContentId.parse(newId()), quantity: 1 };
    const kit = oneKit([{ item: itemFixtureId(ItemFixture.Backpack), quantity: 1, contents: [lost] }]);
    expect(kitRefusal(readsWith(kit), EMPTY_INVENTORY, kit.id)).toStrictEqual({
      field: 'kit',
      message: { key: 'character.validation.unknownKitItem' },
    });
    expect(isKitAddable(kit.data, reads.items)).toBe(false);
  });

  test('refuses a kit that packs items inside one that holds nothing, which the shop then leaves out', () => {
    const rope = { item: itemFixtureId(ItemFixture.Rope), quantity: 1 };
    const kit = oneKit([{ ...rope, contents: [rope] }]);
    expect(kitRefusal(readsWith(kit), EMPTY_INVENTORY, kit.id)).toStrictEqual({
      field: 'kit',
      message: { key: 'character.validation.kitNotAContainer' },
    });
    expect(isKitAddable(kit.data, reads.items)).toBe(false);
    expect(isKitAddable(explorerData(), reads.items)).toBe(true);
  });

  test('refuses a kit whose items would take the inventory past its limit', () => {
    // The explorer kit is four lines.
    expect(kitRefusal(reads, holding(INVENTORY_ITEMS_MAX - 4), explorer)).toBe(undefined);
    expect(kitRefusal(reads, holding(INVENTORY_ITEMS_MAX - 3), explorer)).toStrictEqual({
      field: 'kit',
      message: { key: 'character.validation.kitOverfills', params: { maximum: INVENTORY_ITEMS_MAX } },
    });
  });
});
