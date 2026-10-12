import { describe, expect, test } from 'bun:test';

import { ContentKind, KIND_DATA } from '@pioneer/rules/sdk';

import { KindDataGapReason } from './kind-data-gaps';
import { dataIn } from './testing/build-helpers';
import { translate } from './testing/import-fixtures';
import { gapsOf } from './testing/kind-fixtures';
import { damagePart, spell } from './testing/magic-fixtures';

describe('translateKindData: spell damage and heightening', () => {
  test('fixed heightened damage lays its overrides over the spell part it names', () => {
    const harm = spell('hArM000000000001', 'Harm', {
      level: { value: 1 },
      time: { value: '2' },
      damage: { '0': damagePart('1d8', 'void') },
      heightening: { type: 'fixed', levels: { '8': { damage: { '0': { formula: '1d10' } } } } },
    });

    expect(dataIn(translate([harm]), 'harm')).toMatchObject({
      heightening: {
        type: 'fixed',
        ranks: [{ rank: 8, damage: [{ key: '0', formula: '1d10', damageType: 'void', kinds: ['damage'] }] }],
      },
    });
  });

  test('a Foundry damage part key becomes a slug, and heightening names it the same way', () => {
    const keyed = spell('kEyEd00000000001', 'Keyed', {
      level: { value: 1 },
      time: { value: '2' },
      damage: { rQT6Is4xVcbWJIAt: damagePart('7d8', 'force') },
      heightening: { damage: { rQT6Is4xVcbWJIAt: '1d8' }, interval: 1, type: 'interval' },
    });

    expect(dataIn(translate([keyed]), 'keyed')).toMatchObject({
      damage: [{ key: 'rqt6is4xvcbwjiat' }],
      heightening: { damage: [{ key: 'rqt6is4xvcbwjiat', formula: '1d8' }] },
    });
  });

  test('a damage type Pioneer lacks is reported and left out, with what heightening adds to it', () => {
    const legacy = spell('lEgAcY0000000001', 'Legacy', {
      level: { value: 1 },
      time: { value: '2' },
      damage: { '0': damagePart('2d6', 'positive'), '1': damagePart('1d6', 'fire') },
      heightening: { damage: { '0': '1d6', '1': '1d6' }, interval: 1, type: 'interval' },
    });
    const result = translate([legacy]);

    expect(dataIn(result, 'legacy')).toMatchObject({
      damage: [{ key: '1' }],
      heightening: { damage: [{ key: '1', formula: '1d6' }] },
    });
    expect(gapsOf(result)).toContainEqual({
      reason: KindDataGapReason.UnmappedValue,
      field: 'damage.0.type',
      raw: 'positive',
    });
  });

  test('an untyped part has no damage type, and heightening adds to it', () => {
    const breath = spell('bReAtH0000000001', 'Breath of Life', {
      level: { value: 5 },
      time: { value: 'reaction' },
      damage: { '0': damagePart('5d8', 'untyped', ['healing']) },
      heightening: { damage: { '0': '1d8' }, interval: 1, type: 'interval' },
    });
    const result = translate([breath]);
    const data = dataIn(result, 'breath-of-life');

    expect(data).toMatchObject({
      damage: [{ key: '0', formula: '5d8', kinds: ['healing'] }],
      heightening: { damage: [{ key: '0', formula: '1d8' }] },
    });
    expect(data).not.toHaveProperty('damage.0.damageType');
    expect(gapsOf(result)).toEqual([]);
    expect(KIND_DATA[ContentKind.Spell].safeParse(data).error).toBeUndefined();
  });

  test('an untyped part whose type an overlay sets is chosen by the caster, so it is reported and left out', () => {
    const claw = spell('gOuGiNg000000001', 'Gouging Claw', {
      level: { value: 1 },
      time: { value: '2' },
      damage: { '0': damagePart('2d6', 'untyped'), '1': damagePart('2', 'bleed') },
      heightening: { damage: { '0': '1d6', '1': '1' }, interval: 1, type: 'interval' },
      overlays: {
        a1: { overlayType: 'override', system: { damage: { '0': { type: 'slashing' } } } },
        a2: { overlayType: 'override', system: { damage: { '0': { type: 'piercing' } } } },
      },
    });
    const result = translate([claw]);

    expect(dataIn(result, 'gouging-claw')).toMatchObject({
      damage: [{ key: '1', damageType: 'bleed' }],
      heightening: { damage: [{ key: '1', formula: '1' }] },
    });
    expect(gapsOf(result)).toContainEqual({
      reason: KindDataGapReason.UnmappedValue,
      field: 'damage.0.type',
      raw: 'untyped',
    });
  });

  test("applyMod adds the caster's spellcasting attribute modifier to the formula", () => {
    const trauma = spell('tRaUmA0000000001', 'Torturous Trauma', {
      level: { value: 1 },
      time: { value: '2' },
      damage: { '0': { ...damagePart('1d4', 'bludgeoning'), applyMod: true } },
      heightening: { type: 'fixed', levels: { '3': { damage: { '0': { formula: '2d4' } } } } },
    });
    const result = translate([trauma]);
    const data = dataIn(result, 'torturous-trauma');

    expect(data).toMatchObject({
      damage: [{ key: '0', formula: '1d4 + @spellcasting.attr', damageType: 'bludgeoning' }],
      heightening: { ranks: [{ rank: 3, damage: [{ key: '0', formula: '2d4 + @spellcasting.attr' }] }] },
    });
    expect(gapsOf(result)).toEqual([]);
    expect(KIND_DATA[ContentKind.Spell].safeParse(data).error).toBeUndefined();
  });

  test('materials carry over, through fixed heightening too', () => {
    const spike = spell('sPiKe00000000001', 'Impaling Spike', {
      level: { value: 5 },
      time: { value: '2' },
      damage: { '0': { ...damagePart('8d6', 'piercing'), materials: ['cold-iron'] } },
      heightening: { type: 'fixed', levels: { '7': { damage: { '0': { formula: '10d6' } } } } },
    });
    const result = translate([spike]);
    const data = dataIn(result, 'impaling-spike');

    expect(data).toMatchObject({
      damage: [{ key: '0', formula: '8d6', damageType: 'piercing', materials: ['cold-iron'] }],
      heightening: { ranks: [{ rank: 7, damage: [{ key: '0', formula: '10d6', materials: ['cold-iron'] }] }] },
    });
    expect(gapsOf(result)).toEqual([]);
    expect(KIND_DATA[ContentKind.Spell].safeParse(data).error).toBeUndefined();
  });
});
