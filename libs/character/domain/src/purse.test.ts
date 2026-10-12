import { describe, expect, test } from 'bun:test';

import { CopperValue, Price } from '@pioneer/rules/sdk';

import { CoinsSchema, ItemQuantity } from './inventory';
import type { Coins } from './inventory';
import { coinsOf, coinsValue, payCost, purchaseCost } from './purse';

function purse(coins: object): Coins {
  return CoinsSchema.parse(coins);
}

function pay(coins: object, cost: number): Coins | undefined {
  return payCost(purse(coins), CopperValue.parse(cost));
}

function cost(price: object | undefined, quantity: number): CopperValue {
  return purchaseCost(price === undefined ? undefined : Price.parse(price), ItemQuantity.parse(quantity));
}

describe('coinsValue', () => {
  test('counts every coin in copper', () => {
    expect(coinsValue(purse({ pp: 1, gp: 2, sp: 3, cp: 4 }))).toBe(CopperValue.parse(1234));
  });
});

describe('coinsOf', () => {
  test('gives a value in the largest coins', () => {
    expect(coinsOf(CopperValue.parse(1234))).toStrictEqual(purse({ pp: 1, gp: 2, sp: 3, cp: 4 }));
    expect(coinsOf(CopperValue.parse(0))).toStrictEqual(purse({}));
  });
});

describe('purchaseCost', () => {
  test('is the price times the quantity', () => {
    expect(cost({ coins: { gp: 3, sp: 5 } }, 2)).toBe(CopperValue.parse(700));
  });

  test('shares a batch price out over the batch, rounding up to the copper', () => {
    expect(cost({ coins: { sp: 1 }, per: 10 }, 15)).toBe(CopperValue.parse(15));
    expect(cost({ coins: { cp: 1 }, per: 10 }, 1)).toBe(CopperValue.parse(1));
    expect(cost({ coins: { cp: 1 }, per: 10 }, 11)).toBe(CopperValue.parse(2));
  });

  test('is nothing for an item with no price', () => {
    expect(cost(undefined, 5)).toBe(CopperValue.parse(0));
  });
});

describe('payCost', () => {
  test('pays exactly when the coins allow, largest first', () => {
    expect(pay({ gp: 2, sp: 10, cp: 5 }, 115)).toStrictEqual(purse({ gp: 1, sp: 9, cp: 0 }));
  });

  test('pays exactly with small coins when no large coin fits', () => {
    expect(pay({ gp: 1, sp: 3 }, 30)).toStrictEqual(purse({ gp: 1 }));
  });

  test('breaks the smallest coin that covers what is owed, with change in the largest coins', () => {
    expect(pay({ gp: 1, sp: 1 }, 5)).toStrictEqual(purse({ gp: 1, cp: 5 }));
    expect(pay({ pp: 1, gp: 1 }, 150)).toStrictEqual(purse({ gp: 9, sp: 5 }));
  });

  test('refuses a cost the purse is not worth, and pays one it is worth exactly', () => {
    expect(pay({ gp: 1, cp: 9 }, 110)).toBeUndefined();
    expect(pay({ gp: 1, sp: 1 }, 110)).toStrictEqual(purse({}));
  });

  test('takes nothing for nothing', () => {
    expect(pay({ sp: 2 }, 0)).toStrictEqual(purse({ sp: 2 }));
    expect(pay({}, 0)).toStrictEqual(purse({}));
  });
});
