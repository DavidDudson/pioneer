import { BulkCount, BulkWeight } from '@pioneer/rules/sdk';

import { InventoryPlacement } from '../inventory/inventory-line';
import type { InventoryGroup, InventoryLine } from '../inventory/inventory-line';

const CHALK_PIECES = 10;
const ARROWS = 50;
const ARROWS_PER_BULK = 10;
const ONE_BULK = BulkCount.parse(1);

/** A line of one light item, unless `overrides` say otherwise. */
function line(id: string, name: string | undefined, overrides: Partial<InventoryLine> = {}): InventoryLine {
  return {
    id,
    name,
    contentName: undefined,
    quantity: 1,
    bulk: BulkWeight.Light,
    bulkPer: undefined,
    hands: undefined,
    invested: false,
    contents: [],
    ...overrides,
  };
}

/**
 * A fighter's gear: armour, an invested cloak and a backpack holding a pouch of chalk, a sword in one hand, loose
 * treasure and arrows, and a shield dropped.
 */
export const FIGHTER_INVENTORY: readonly InventoryGroup[] = [
  {
    placement: InventoryPlacement.Worn,
    lines: [
      line('armor', 'Leather Armor', { bulk: ONE_BULK }),
      line('cloak', 'Cloak of Elvenkind', { invested: true }),
      line('backpack', 'Backpack', {
        bulk: BulkWeight.Negligible,
        contents: [
          line('rope', 'Climbing rope', { contentName: 'Rope' }),
          line('pouch', 'Belt Pouch', {
            bulk: BulkWeight.Negligible,
            contents: [line('chalk', 'Chalk', { quantity: CHALK_PIECES, bulk: BulkWeight.Negligible })],
          }),
        ],
      }),
    ],
  },
  { placement: InventoryPlacement.Held, lines: [line('longsword', 'Longsword', { bulk: ONE_BULK, hands: 1 })] },
  {
    placement: InventoryPlacement.Stowed,
    lines: [
      line('diamond', 'Diamond', { quantity: 2, bulk: BulkWeight.Negligible }),
      line('arrows', 'Arrows', { quantity: ARROWS, bulkPer: ARROWS_PER_BULK }),
      line('lost', undefined, { bulk: undefined }),
    ],
  },
  { placement: InventoryPlacement.Dropped, lines: [line('shield', 'Steel Shield', { bulk: ONE_BULK })] },
];
