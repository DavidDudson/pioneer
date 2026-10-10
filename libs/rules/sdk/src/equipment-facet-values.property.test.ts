import { describe, expect, test } from 'bun:test';

import { assert, constantFrom, integer, oneof, option, property, record } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { bulkInTenths, priceInCopper } from './equipment-facet-values';
import { Bulk, BulkWeight, Price } from './physical-item';

const COINS_MAX = 2000;
const BULK_MAX = 100;

const count: Arbitrary<number | undefined> = option(integer({ min: 1, max: COINS_MAX }), { nil: undefined });

const price: Arbitrary<Price> = record({ pp: count, gp: count, sp: count, cp: count })
  .filter((coins) => Object.values(coins).some((each) => each !== undefined))
  .map((coins) =>
    Price.parse({ coins: Object.fromEntries(Object.entries(coins).filter(([, each]) => each !== undefined)) }),
  );

const bulk: Arbitrary<Bulk> = oneof(constantFrom(...Object.values(BulkWeight)), integer({ min: 1, max: BULK_MAX })).map(
  (each) => Bulk.parse(each),
);

/** Bulk as the rules order it: negligible, then light, then whole Bulk. */
function bulkRank(each: Bulk): number {
  if (each === BulkWeight.Negligible) {
    return 0;
  }
  return each === BulkWeight.Light ? 1 : each + 1;
}

describe('equipment facet values', () => {
  test('a price in copper is each coin at its worth, so one more of any coin costs more', () => {
    assert(
      property(price, constantFrom('pp', 'gp', 'sp', 'cp'), (base, coin) => {
        const coins: Record<string, number | undefined> = { ...base.coins };
        const raised = Price.parse({ ...base, coins: { ...coins, [coin]: (coins[coin] ?? 0) + 1 } });
        expect(priceInCopper(raised)).toBeGreaterThan(priceInCopper(base));
      }),
    );
  });

  test('a price in copper is 1000 per platinum, 100 per gold and 10 per silver', () => {
    assert(
      property(price, ({ coins }) => {
        const expected = (coins.pp ?? 0) * 1000 + (coins.gp ?? 0) * 100 + (coins.sp ?? 0) * 10 + (coins.cp ?? 0);
        expect(priceInCopper(Price.parse({ coins })) as number).toBe(expected);
      }),
    );
  });

  test('bulk in tenths keeps the rules order: negligible below light below 1 Bulk below more', () => {
    assert(
      property(bulk, bulk, (left, right) => {
        expect(Math.sign(bulkInTenths(left) - bulkInTenths(right))).toBe(Math.sign(bulkRank(left) - bulkRank(right)));
      }),
    );
  });

  test('ten light items are 1 Bulk', () => {
    expect(bulkInTenths(Bulk.parse(BulkWeight.Light)) * 10).toBe(bulkInTenths(Bulk.parse(1)));
  });
});
