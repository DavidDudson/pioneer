import { describe, test } from 'bun:test';

import { Coin, CopperValue } from '@pioneer/rules/sdk';
import { assert, integer, nat, property, record } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { CoinsSchema } from './inventory';
import type { Coins } from './inventory';
import { coinsValue, payCost } from './purse';

const COINS = [Coin.Platinum, Coin.Gold, Coin.Silver, Coin.Copper] as const;
const COUNT_MAX = 6;
const COST_MAX = 8000;
const COPPER = [1000, 100, 10, 1] as const;

const coins: Arbitrary<Coins> = record({
  pp: nat(COUNT_MAX),
  gp: nat(COUNT_MAX),
  sp: nat(COUNT_MAX),
  cp: nat(COUNT_MAX),
}).map((counts) => CoinsSchema.parse(counts));

const cost: Arbitrary<CopperValue> = integer({ min: 0, max: COST_MAX }).map((value) => CopperValue.parse(value));

/** Whether some of `purse`'s coins add up to `cost` exactly, by trying every handful. */
function exactlyPayable(purse: Coins, target: number): boolean {
  const { pp, gp, sp, cp } = purse;
  for (let platinum = 0; platinum <= pp; platinum += 1) {
    for (let gold = 0; gold <= gp; gold += 1) {
      for (let silver = 0; silver <= sp; silver += 1) {
        const rest = target - platinum * COPPER[0] - gold * COPPER[1] - silver * COPPER[2];
        if (rest >= 0 && rest <= cp) {
          return true;
        }
      }
    }
  }
  return false;
}

describe('payCost properties', () => {
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
      property(coins, cost, (purse, price) => (payCost(purse, price) === undefined) === coinsValue(purse) < price),
    );
  });

  test('takes nothing for a free item', () => {
    assert(property(coins, (purse) => JSON.stringify(payCost(purse, CopperValue.parse(0))) === JSON.stringify(purse)));
  });

  test('gives no change when the coins pay exactly', () => {
    assert(
      property(coins, cost, (purse, price) => {
        const paid = payCost(purse, price);
        return !exactlyPayable(purse, price) || COINS.every((coin) => (paid?.[coin] ?? 0) <= purse[coin]);
      }),
    );
  });

  test('breaks at most one coin, and gives change only below it', () => {
    assert(
      property(coins, cost, (purse, price) => {
        const paid = payCost(purse, price);
        if (paid === undefined) {
          return true;
        }
        const gained = COINS.filter((coin) => paid[coin] > purse[coin]);
        const largestGained = gained[0];
        return (
          largestGained === undefined ||
          COINS.slice(0, COINS.indexOf(largestGained)).some((coin) => paid[coin] < purse[coin])
        );
      }),
    );
  });
});
