import { describe, test } from 'bun:test';

import { Coin, COPPER_PER_COIN, CopperValue } from '@pioneer/rules/sdk';
import { assert, integer, nat, property, record } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { CoinsSchema, ItemQuantity } from './inventory';
import type { Coins } from './inventory';
import { coinsOf, coinsValue, payCost, payment, purchaseCost } from './purse';

const COINS = [Coin.Platinum, Coin.Gold, Coin.Silver, Coin.Copper] as const;
const SMALLEST_FIRST = COINS.toReversed();
const COUNT_MAX = 6;
const COST_MAX = 8000;
const QUANTITY_MAX = 32_767;
/** How many of a coin make one of the next larger coin. */
const PER_LARGER = 10;

const coins: Arbitrary<Coins> = record({
  pp: nat(COUNT_MAX),
  gp: nat(COUNT_MAX),
  sp: nat(COUNT_MAX),
  cp: nat(COUNT_MAX),
}).map((counts) => CoinsSchema.parse(counts));

const cost: Arbitrary<CopperValue> = integer({ min: 0, max: COST_MAX }).map((value) => CopperValue.parse(value));

/** Every handful of `purse`'s coins, as its value in copper. */
function handfulValues(purse: Coins): number[] {
  const values: number[] = [0];
  for (const coin of COINS) {
    const worth = COPPER_PER_COIN[coin];
    const before = [...values];
    for (let count = 1; count <= purse[coin]; count += 1) {
      values.push(...before.map((value) => value + count * worth));
    }
  }
  return values;
}

/** The least any handful of `purse` overpays `target` by; 0 when some handful pays it exactly. */
function leastOverpayment(purse: Coins, target: number): number {
  const overpayments = handfulValues(purse)
    .filter((value) => value >= target)
    .map((value) => value - target);
  return Math.min(...overpayments);
}

/** The smallest coin `handed` holds, or undefined for an empty hand. */
function smallestHanded(handed: Coins): Coin | undefined {
  return SMALLEST_FIRST.find((coin) => handed[coin] > 0);
}

describe('payment properties', () => {
  test('the purse loses exactly the cost, and no count goes below zero', () => {
    assert(
      property(coins, cost, (purse, price) => {
        const paid = payCost(purse, price);
        return (
          paid === undefined ||
          (coinsValue(paid) === coinsValue(purse) - price && COINS.every((coin) => paid[coin] >= 0))
        );
      }),
    );
  });

  test('refuses iff the purse is worth less than the cost', () => {
    assert(
      property(coins, cost, (purse, price) => (payment(purse, price) === undefined) === coinsValue(purse) < price),
    );
  });

  test('hands over coins the purse holds, overpaying no more than any handful of them must', () => {
    assert(
      property(coins, cost, (purse, price) => {
        const paid = payment(purse, price);
        if (paid === undefined) {
          return true;
        }
        const { handed } = paid;
        const held = COINS.every((coin) => handed[coin] <= purse[coin]);
        return held && coinsValue(handed) - price === leastOverpayment(purse, price);
      }),
    );
  });

  test('hands over no coin it does not need, so at most one coin is broken', () => {
    assert(
      property(coins, cost, (purse, price) => {
        const paid = payment(purse, price);
        const smallest = paid === undefined ? undefined : smallestHanded(paid.handed);
        return (
          paid === undefined || smallest === undefined || coinsValue(paid.handed) - price < COPPER_PER_COIN[smallest]
        );
      }),
    );
  });

  test('gives the change in the largest coins: fewer than ten of any coin below platinum', () => {
    assert(
      property(coins, cost, (purse, price) => {
        const paid = payment(purse, price);
        const below = COINS.slice(1);
        return (
          paid === undefined ||
          (coinsValue(paid.change) === coinsValue(paid.handed) - price &&
            below.every((coin) => paid.change[coin] < PER_LARGER))
        );
      }),
    );
  });

  test('gives no change when the coins pay exactly', () => {
    assert(
      property(coins, cost, (purse, price) => {
        const paid = payment(purse, price);
        return leastOverpayment(purse, price) !== 0 || coinsValue(paid?.change ?? purse) === 0;
      }),
    );
  });

  test('an item with no price costs nothing, in any quantity, and leaves the purse as it was', () => {
    const quantity = integer({ min: 1, max: QUANTITY_MAX }).map((count) => ItemQuantity.parse(count));
    assert(
      property(coins, quantity, (purse, count) => {
        const paid = payCost(purse, purchaseCost(undefined, count));
        return JSON.stringify(paid) === JSON.stringify(purse);
      }),
    );
  });

  test('coinsOf gives coins worth the value', () => {
    assert(property(cost, (value) => coinsValue(coinsOf(value)) === value));
  });
});
