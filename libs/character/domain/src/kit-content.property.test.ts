import { describe, expect, test } from 'bun:test';

import { ContentId, KitData } from '@pioneer/rules/sdk';
import { newId } from '@pioneer/shared/kernel';
import { array, assert, boolean, integer, option, property, record, uuid } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { InventoryItemId } from './inventory';
import { kitItems } from './kit-content';

/** As many items as a kit, or a container in one, lists. */
const KIT_ITEMS_MAX = 32;
const QUANTITY_MAX = 100;

const contentIds = uuid({ version: 4 }).map((id) => ContentId.parse(id));
const kitItem = record({
  item: contentIds,
  quantity: integer({ min: 1, max: QUANTITY_MAX }),
});
/** A kit's `data`: items, some holding others as containers do. */
const containerContents = option(array(kitItem, { maxLength: KIT_ITEMS_MAX }), { nil: undefined });
const kit: Arbitrary<KitData> = array(record({ line: kitItem, contents: containerContents }), {
  minLength: 1,
  maxLength: KIT_ITEMS_MAX,
}).map((lines) =>
  KitData.parse({
    items: lines.map(({ line, contents }) => (contents === undefined ? line : { ...line, contents })),
  }),
);

function freshId(): InventoryItemId {
  return InventoryItemId.parse(newId());
}

describe('kitItems (properties)', () => {
  test('a line per item and per item a container holds, each fresh, where the kit puts it', () => {
    assert(
      property(kit, boolean(), (data, stowed) => {
        const container = stowed ? freshId() : undefined;
        const lines = kitItems(data, container, freshId);

        // Each line with the index of the kit item it sits in, or -1 where the kit puts it.
        const expected = data.items.flatMap(({ item, quantity, contents = [] }, at) => [
          { item, quantity: Number(quantity), under: -1 },
          ...contents.map((inner) => ({ item: inner.item, quantity: Number(inner.quantity), under: at })),
        ]);
        const tops = lines.filter((line) => line.container === container).map((line) => line.id);
        expect(
          lines.map(({ item, quantity, container: holder }) => ({
            item,
            quantity: Number(quantity),
            under: holder === container ? -1 : tops.indexOf(holder ?? freshId()),
          })),
        ).toStrictEqual(expected);
        expect(new Set(lines.map((line) => line.id)).size).toBe(lines.length);
      }),
    );
  });
});
