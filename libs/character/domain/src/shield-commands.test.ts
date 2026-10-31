import { describe, expect, test } from 'bun:test';

import { DamageTotal } from '@pioneer/rules/dice';
import { Hardness, HitPoints } from '@pioneer/rules/sdk';

import { InventoryItemId } from './inventory';
import { applyPlayCommand, currentHitPoints, FRESH_PLAY, PlayCommandField } from './play-state';
import type { PlayState } from './play-state';
import { blocked, blockProblem, ShieldCondition, shieldCondition, ShieldProblem } from './shield-commands';
import type { ShieldContent, ShieldStats } from './shield-commands';
import { within } from './testing';
import { untypedDamage } from './untyped-damage';

const MAX = HitPoints.parse(30);
const ITEM = InventoryItemId.parse('00000000-0000-4000-8000-000000000001');
const OTHER = InventoryItemId.parse('00000000-0000-4000-8000-000000000002');
/** A steel shield: Hardness 5, 20 Hit Points, broken at 10. */
const STEEL: ShieldStats = {
  hardness: Hardness.parse(5),
  hitPoints: HitPoints.parse(20),
  brokenThreshold: HitPoints.parse(10),
};
const HELD: ShieldContent = new Map([[ITEM, STEEL]]);

function hp(value: number): HitPoints {
  return HitPoints.parse(value);
}

function total(value: number): DamageTotal {
  return DamageTotal.parse(value);
}

/** `play` having taken `damage` on the shield already. */
function worn(damage: number): PlayState {
  return { ...FRESH_PLAY, shields: { [ITEM]: hp(damage) } };
}

function block(play: PlayState, taken: number, item = ITEM): PlayState {
  return applyPlayCommand(
    play,
    { field: PlayCommandField.BlockWithShield, item, damage: untypedDamage(hp(taken)) },
    { ...within(MAX), shields: HELD },
  );
}

describe('blocked', () => {
  test.each([
    [3, 3, 0],
    [5, 5, 0],
    [12, 5, 7],
    [0, 0, 0],
  ])('%p damage against Hardness 5 prevents %p and lets %p through', (taken, prevented, remaining) => {
    expect(blocked(total(taken), Hardness.parse(5))).toStrictEqual({
      prevented: total(prevented),
      remaining: total(remaining),
    });
  });
});

describe('shieldCondition', () => {
  test.each([
    [0, ShieldCondition.Whole],
    [9, ShieldCondition.Whole],
    [10, ShieldCondition.Broken],
    [19, ShieldCondition.Broken],
    [20, ShieldCondition.Destroyed],
  ])('a steel shield with %p damage is %p', (damage, expected) => {
    expect(shieldCondition(STEEL, hp(damage))).toBe(expected);
  });
});

describe('Shield Block', () => {
  test('damage within Hardness is prevented whole: neither the character nor the shield is hurt', () => {
    const after = block(FRESH_PLAY, 4);
    expect(currentHitPoints(after.hp, MAX)).toBe(MAX);
    expect(after.shields).toStrictEqual({ [ITEM]: hp(0) });
  });

  test('what Hardness does not prevent falls on the character and the shield each', () => {
    const after = block(FRESH_PLAY, 12);
    expect(currentHitPoints(after.hp, MAX)).toBe(hp(23));
    expect(after.shields).toStrictEqual({ [ITEM]: hp(7) });
  });

  test('damage on the shield adds up across blocks', () => {
    expect(block(worn(7), 8).shields).toStrictEqual({ [ITEM]: hp(10) });
  });

  test('a shield taken to 0 Hit Points is destroyed, so its damage is no longer kept', () => {
    const after = block(worn(8), 40);
    expect(after.shields).toStrictEqual({});
    expect(currentHitPoints(after.hp, MAX)).toBe(hp(0));
  });

  test('a broken shield blocks nothing', () => {
    const broken = worn(10);
    expect(block(broken, 12)).toStrictEqual(broken);
  });

  test('a shield the character does not hold blocks nothing', () => {
    expect(block(FRESH_PLAY, 12, OTHER)).toStrictEqual(FRESH_PLAY);
  });
});

describe('blockProblem', () => {
  test('is none for a whole shield, and says why for a broken or missing one', () => {
    expect(blockProblem(HELD, {}, ITEM)).toBeUndefined();
    expect(blockProblem(HELD, { [ITEM]: hp(12) }, ITEM)).toBe(ShieldProblem.Broken);
    expect(blockProblem(HELD, {}, OTHER)).toBe(ShieldProblem.NotHeld);
  });
});

describe('Shield Block with the shield of a battle form', () => {
  const FORM: ShieldStats = { ...STEEL, hardness: Hardness.parse(15), undamageable: true };
  const formBlock = (taken: number): PlayState =>
    applyPlayCommand(
      FRESH_PLAY,
      { field: PlayCommandField.BlockWithShield, item: ITEM, damage: untypedDamage(hp(taken)) },
      { ...within(MAX), shields: new Map([[ITEM, FORM]]) },
    );

  test('Hardness prevents its share, the character takes the rest and no damage is kept on the shield', () => {
    const after = formBlock(20);

    expect(currentHitPoints(after.hp, MAX)).toBe(hp(25));
    expect(after.shields).toStrictEqual({});
  });

  test('it is never broken or destroyed, however much it blocks', () => {
    expect(shieldCondition(FORM, hp(100))).toBe(ShieldCondition.Whole);
  });
});
