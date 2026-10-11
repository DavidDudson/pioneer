import { constant, integer, nat, oneof, option, record, uniqueArray, uuid } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { InventorySchema } from '../inventory';
import type { Inventory } from '../inventory';

const ITEMS_MAX = 8;
const QUANTITY_MAX = 999;
const COINS_MAX = 100_000;

/** One generated line: its content and, by index, an earlier line it may sit in. */
interface Line {
  readonly id: string;
  readonly item: string;
  readonly quantity: number;
  readonly holder: number | undefined;
}

const line: Arbitrary<Line> = record({
  id: uuid({ version: 4 }),
  item: uuid({ version: 4 }),
  quantity: integer({ min: 1, max: QUANTITY_MAX }),
  holder: option(nat(), { nil: undefined }),
});

const coins = record({
  pp: integer({ min: 0, max: COINS_MAX }),
  gp: integer({ min: 0, max: COINS_MAX }),
  sp: integer({ min: 0, max: COINS_MAX }),
  cp: integer({ min: 0, max: COINS_MAX }),
});

/**
 * JSON of a valid inventory: unique ids, and each item either loose or inside one listed before it, so containers
 * nest and never loop.
 */
export const inventoryJson: Arbitrary<unknown> = record({
  lines: uniqueArray(line, { maxLength: ITEMS_MAX, selector: (each) => each.id }),
  coins: oneof(constant({}), coins),
}).map(({ lines, coins: purse }) => ({
  items: lines.map(({ id, item, quantity, holder }, index) => {
    const container = holder === undefined || index === 0 ? undefined : lines[holder % index]?.id;
    return container === undefined ? { id, item, quantity } : { id, item, quantity, container };
  }),
  coins: purse,
}));

/** A valid inventory. */
export const inventory: Arbitrary<Inventory> = inventoryJson.map((json) => InventorySchema.parse(json));
