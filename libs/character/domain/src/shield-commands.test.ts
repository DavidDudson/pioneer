import { describe, expect, test } from 'bun:test';

import { DamageTotal } from '@pioneer/rules/dice';
import type { DamageApplication } from '@pioneer/rules/dice';
import { ContentId, DamageType, Hardness, HitPoints } from '@pioneer/rules/sdk';

import { ActiveEffectSchema, EffectInstanceId } from './effects';
import type { ActiveEffect } from './effects';
import type { ShieldGrant } from './held-shields';
import { InventoryItemId } from './inventory';
import { applyPlayCommand, currentHitPoints, FRESH_PLAY, PlayCommandField } from './play-state';
import type { PlayState } from './play-state';
import { blocked, blockProblem, hardnessFor, ShieldCondition, shieldCondition, ShieldProblem } from './shield-commands';
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
const instance = (id: string, effect: ContentId): ActiveEffect =>
  ActiveEffectSchema.parse({ id: EffectInstanceId.parse(id), effect });

describe('Shield Block with a shield an effect gives', () => {
  const EFFECT = ContentId.parse('00000000-0000-4000-8000-0000000000e1');
  const OTHER_EFFECT = ContentId.parse('00000000-0000-4000-8000-0000000000e2');
  const SPELL = instance('00000000-0000-4000-8000-0000000000a1', EFFECT);
  const BYSTANDER = instance('00000000-0000-4000-8000-0000000000a2', OTHER_EFFECT);
  const WITH_SPELL: PlayState = { ...FRESH_PLAY, effects: [SPELL, BYSTANDER] };

  const given = (stats: Partial<ShieldStats>, damage = 0): PlayState =>
    applyPlayCommand(
      { ...WITH_SPELL, shields: damage === 0 ? {} : { [ITEM]: hp(damage) } },
      { field: PlayCommandField.BlockWithShield, item: ITEM, damage: untypedDamage(hp(12)) },
      {
        ...within(MAX),
        shields: new Map([
          [
            ITEM,
            {
              ...STEEL,
              granted: {
                effect: EFFECT,
                endsOnBlock: false,
                endsWhenDestroyed: false,
                raised: false,
                layered: false,
                recreatedOnSustain: false,
              },
              ...stats,
            },
          ],
        ]),
      },
    );
  const grant = (endsOnBlock: boolean, endsWhenDestroyed: boolean): ShieldGrant => ({
    effect: EFFECT,
    endsOnBlock,
    endsWhenDestroyed,
    raised: false,
    layered: false,
    recreatedOnSustain: false,
  });

  test('a shield that ends on a block takes its effect with it, and leaves the other effects', () => {
    const after = given({ granted: grant(true, false) });

    expect(after.effects).toStrictEqual([BYSTANDER]);
  });

  test('a shield that does not end on a block keeps its effect', () => {
    expect(given({ granted: grant(false, false) }).effects).toStrictEqual([SPELL, BYSTANDER]);
  });

  test('a shield taken to 0 Hit Points ends its effect when it ends then', () => {
    const fragile = { hitPoints: hp(1), brokenThreshold: hp(0) };

    expect(given({ ...fragile, granted: grant(false, true) }).effects).toStrictEqual([BYSTANDER]);
  });

  test('a destroyed shield that does not end its effect is whole again, with no damage kept', () => {
    const fragile = { hitPoints: hp(1), brokenThreshold: hp(0) };
    const after = given({ ...fragile, granted: grant(false, false) });

    expect(after.effects).toStrictEqual([SPELL, BYSTANDER]);
    expect(after.shields).toStrictEqual({});
  });

  test('damage on a shield whose effect ended is no longer kept', () => {
    expect(given({ granted: grant(true, false) }, 3).shields).toStrictEqual({});
  });
});

/** Damage of one `type` taken in full, as a roll gives it. */
function damageOf(amount: number, ...types: readonly (DamageType | undefined)[]): DamageApplication {
  const each = DamageTotal.parse(amount);
  return {
    critical: false,
    immediate: types.map((type) => ({ type, rolled: each, dealt: each, taken: each, lines: [] })),
    persistent: [],
    taken: DamageTotal.parse(amount * types.length),
    persistentTaken: DamageTotal.parse(0),
  };
}

describe('a shield with extra Hardness against some damage', () => {
  const BONE: ShieldStats = {
    hardness: Hardness.parse(3),
    hitPoints: HitPoints.parse(1),
    brokenThreshold: HitPoints.parse(0),
    hardnessAgainst: [{ types: [DamageType.Piercing, DamageType.Slashing], bonus: Hardness.parse(2) }],
  };

  test.each([
    [[DamageType.Piercing], 5],
    [[DamageType.Slashing], 5],
    [[DamageType.Piercing, DamageType.Slashing], 5],
    [[DamageType.Bludgeoning], 3],
    [[DamageType.Piercing, DamageType.Bludgeoning], 3],
    [[undefined], 3],
    [[], 3],
  ])('against %j its Hardness is %p', (types, hardness) => {
    expect(hardnessFor(BONE, damageOf(4, ...types))).toBe(Hardness.parse(hardness));
  });

  test('a block prevents the Hardness for the damage it blocks', () => {
    const play = (damage: DamageApplication): PlayState =>
      applyPlayCommand(
        FRESH_PLAY,
        { field: PlayCommandField.BlockWithShield, item: ITEM, damage },
        { ...within(MAX), shields: new Map([[ITEM, BONE]]) },
      );

    const slashed = play(damageOf(8, DamageType.Slashing));
    const burned = play(damageOf(8, DamageType.Fire));

    expect(currentHitPoints(slashed.hp, MAX)).toBe(hp(27));
    expect(currentHitPoints(burned.hp, MAX)).toBe(hp(25));
  });
});
