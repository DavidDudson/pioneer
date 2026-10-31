import { describe, expect, test } from 'bun:test';

import { DieFace } from '@pioneer/rules/dice';
import { Dc } from '@pioneer/rules/sdk';

import { Boundary, wandOverchargeKey, wandUseKey } from './counted-resources';
import { removeItem } from './inventory';
import type { Inventory } from './inventory';
import { FRESH_PLAY } from './play-state';
import { ResourceCount } from './resource-count';
import {
  afterWandCommand,
  CAST_WAND,
  fireballWand,
  heldWandSource,
  overchargeWand,
  WAND_ID,
  wandCounted,
  wandEntry,
  wandSourceOf,
} from './testing';
import {
  OVERCHARGE_DC,
  overchargePasses,
  wandInventoryAfter,
  WandOutcome,
  wandOutcome,
  WandProblem,
  wandProblem,
  wandUsesAfter,
} from './wand-commands';

const WAND = fireballWand();
const ONE = ResourceCount.parse(1);
const COINS: Inventory['coins'] = {
  pp: 0,
  gp: 0,
  sp: 0,
  cp: 0,
} as Inventory['coins'];
const STOCK: Inventory = { items: [WAND], customItems: [], coins: COINS };
const SPENT = afterWandCommand(FRESH_PLAY, [WAND], CAST_WAND);
const FLAT = (face: number): DieFace => DieFace.parse(face);

describe('wandProblem', () => {
  test('refuses an item that is not a held wand', () => {
    expect(wandProblem(CAST_WAND, undefined)).toBe(WandProblem.NotHeld);
  });

  test('refuses a broken wand, cast or overcharged', () => {
    const broken = wandSourceOf([fireballWand({ broken: true })]);
    expect(wandProblem(CAST_WAND, broken)).toBe(WandProblem.Broken);
    expect(wandProblem(overchargeWand(15), broken)).toBe(WandProblem.Broken);
  });

  test('refuses a spell the holder cannot cast', () => {
    const source = wandSourceOf([WAND], FRESH_PLAY, [wandEntry('divine', [3])]);
    expect(wandProblem(CAST_WAND, source)).toBe(WandProblem.NotCastable);
  });

  test('allows the day cast', () => {
    expect(wandProblem(CAST_WAND, wandSourceOf([WAND]))).toBeUndefined();
  });

  test('refuses the day cast once it is spent', () => {
    expect(wandProblem(CAST_WAND, wandSourceOf([WAND], SPENT))).toBe(WandProblem.UseSpent);
  });

  test('offers no overcharge while the day cast is unspent', () => {
    expect(wandProblem(overchargeWand(15), wandSourceOf([WAND]))).toBe(WandProblem.UseLeft);
  });

  test('offers an overcharge once the day cast is spent', () => {
    expect(wandProblem(overchargeWand(15), wandSourceOf([WAND], SPENT))).toBeUndefined();
  });

  test('needs the flat check rolled for an overcharge', () => {
    expect(wandProblem(overchargeWand(), wandSourceOf([WAND], SPENT))).toBe(WandProblem.RollMissing);
  });
});

describe('overcharging', () => {
  test('passes the flat check at DC 10 or more', () => {
    expect(OVERCHARGE_DC).toBe(Dc.parse(10));
    expect(overchargePasses(FLAT(10))).toBe(true);
    expect(overchargePasses(FLAT(20))).toBe(true);
    expect(overchargePasses(FLAT(9))).toBe(false);
    expect(overchargePasses(FLAT(1))).toBe(false);
  });

  test('a passed check casts the spell and breaks the wand', () => {
    expect(wandOutcome(overchargeWand(10), heldWandSource([WAND], SPENT))).toBe(WandOutcome.Broken);
  });

  test('a failed check destroys the wand and casts nothing', () => {
    expect(wandOutcome(overchargeWand(9), heldWandSource([WAND], SPENT))).toBe(WandOutcome.Destroyed);
  });

  test('a wand already overcharged today is destroyed without a roll, even once repaired', () => {
    const overcharged = afterWandCommand(SPENT, [WAND], overchargeWand(15));
    const repaired = heldWandSource([WAND], overcharged);
    expect(repaired.overcharge.left).toBe(ResourceCount.parse(0));
    expect(wandProblem(overchargeWand(), repaired)).toBeUndefined();
    expect(wandOutcome(overchargeWand(), repaired)).toBe(WandOutcome.Destroyed);
    expect(wandOutcome(overchargeWand(20), repaired)).toBe(WandOutcome.Destroyed);
  });
});

describe('the inventory after a wand cast', () => {
  test('is as it was after the day cast', () => {
    expect(wandInventoryAfter(STOCK, WAND_ID, WandOutcome.Cast)).toBe(STOCK);
  });

  test('has the wand marked broken after a passed check', () => {
    expect(wandInventoryAfter(STOCK, WAND_ID, WandOutcome.Broken).items[0]?.broken).toBe(true);
  });

  test('has the wand gone after a failed one', () => {
    expect(wandInventoryAfter(STOCK, WAND_ID, WandOutcome.Destroyed)).toEqual(removeItem(STOCK, WAND_ID));
  });
});

describe('the wand counts spent', () => {
  test('are one a day for the cast and one for the overcharge, back at daily preparations', () => {
    const { uses } = wandCounted([WAND]);
    expect(uses.get(wandUseKey(WAND_ID))).toEqual({
      max: ONE,
      boundary: Boundary.Day,
    });
    expect(uses.get(wandOverchargeKey(WAND_ID))).toEqual({
      max: ONE,
      boundary: Boundary.Day,
    });
  });

  test('take one from the cast, or from the overcharge', () => {
    const counted = wandCounted([WAND]);
    expect(wandUsesAfter({}, counted, CAST_WAND)[wandUseKey(WAND_ID)]).toBe(ONE);
    expect(wandUsesAfter({}, counted, overchargeWand(12))[wandOverchargeKey(WAND_ID)]).toBe(ONE);
  });
});
