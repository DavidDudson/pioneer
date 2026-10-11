import { boolean, constant, constantFrom, integer, nat, oneof, option, record, uniqueArray, uuid } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { InventorySchema } from '../inventory';
import type { Inventory } from '../inventory';
import { CarryState, HANDS_MAX, INVESTED_MAX } from '../item-carry';

/** Past the investment limit, so the cap is reached. */
const ITEMS_MAX = 12;
const QUANTITY_MAX = 999;
const COINS_MAX = 100_000;

/** One generated line: its content, by index an earlier line it may sit in, how it is carried loose, and investment. */
interface Line {
  readonly id: string;
  readonly item: string;
  readonly quantity: number;
  readonly holder: number | undefined;
  readonly carry: CarryState;
  readonly hands: number;
  readonly invested: boolean;
}

const line: Arbitrary<Line> = record({
  id: uuid({ version: 4 }),
  item: uuid({ version: 4 }),
  quantity: integer({ min: 1, max: QUANTITY_MAX }),
  holder: option(nat(), { nil: undefined }),
  carry: constantFrom(...Object.values(CarryState)),
  hands: integer({ min: 1, max: HANDS_MAX }),
  invested: boolean(),
});

const coins = record({
  pp: integer({ min: 0, max: COINS_MAX }),
  gp: integer({ min: 0, max: COINS_MAX }),
  sp: integer({ min: 0, max: COINS_MAX }),
  cp: integer({ min: 0, max: COINS_MAX }),
});

/** How a line is carried: stowed inside a container, else as generated, while hands are left to hold it. */
function carryOf({ carry, hands }: Line, contained: boolean, handsFree: number): object {
  if (contained || (carry === CarryState.Held && hands > handsFree)) {
    return { state: CarryState.Stowed };
  }
  return carry === CarryState.Held ? { state: carry, hands } : { state: carry };
}

/**
 * JSON of a valid inventory: unique ids, each item either loose or inside one listed before it, so containers nest
 * and never loop; only loose items worn, held or dropped, no more held than two hands hold, and no more invested than
 * the limit.
 */
export const inventoryJson: Arbitrary<unknown> = record({
  lines: uniqueArray(line, { maxLength: ITEMS_MAX, selector: (each) => each.id }),
  coins: oneof(constant({}), coins),
}).map(({ lines, coins: purse }) => {
  let handsFree: number = HANDS_MAX;
  let investable: number = INVESTED_MAX;
  const items = lines.map((each, index) => {
    const { id, item, quantity, holder } = each;
    const invested = each.invested && investable > 0;
    if (invested) {
      investable -= 1;
    }
    const container = holder === undefined || index === 0 ? undefined : lines[holder % index]?.id;
    const carry = carryOf(each, container !== undefined, handsFree);
    if ('hands' in carry && typeof carry.hands === 'number') {
      handsFree -= carry.hands;
    }
    return {
      id,
      item,
      quantity,
      ...(container === undefined ? {} : { container }),
      carry,
      ...(invested ? { invested } : {}),
    };
  });
  return { items, coins: purse };
});

/** A valid inventory. */
export const inventory: Arbitrary<Inventory> = inventoryJson.map((json) => InventorySchema.parse(json));
