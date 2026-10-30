import { describe, expect, test } from 'bun:test';

import { ContentKind, KIND_DATA } from '@pioneer/rules/sdk';

import { KindDataGapReason } from './kind-data-gaps';
import { dataIn } from './testing/build-helpers';
import { translate } from './testing/import-fixtures';
import { gapsOf } from './testing/kind-fixtures';
import { damagePart, spell } from './testing/magic-fixtures';

const HEAL_TRAITS = { value: ['concentrate', 'healing', 'manipulate', 'vitality'] };

const heal = spell('hEaL000000000001', 'Heal', {
  level: { value: 1 },
  time: { value: '1 to 3' },
  range: { value: 'touch' },
  target: { value: '1 willing living creature or 1 undead' },
  damage: { '0': damagePart('1d8', 'vitality', ['damage', 'healing']) },
  heightening: { damage: { '0': '1d8' }, interval: 1, type: 'interval' },
  overlays: {
    o1: { overlayType: 'override', sort: 1, system: { range: { value: 'touch' }, time: { value: '1' } } },
    o2: {
      name: 'Heal (vs. Living)',
      overlayType: 'override',
      sort: 2,
      system: {
        damage: { '0': { formula: '1d8+8', kinds: ['healing'] } },
        heightening: { damage: { '0': '1d8+8' } },
        range: { value: '30 feet' },
        time: { value: '2' },
        traits: HEAL_TRAITS,
      },
    },
    o3: {
      overlayType: 'override',
      sort: 3,
      system: { area: { type: 'emanation', value: 30 }, range: { value: '' }, time: { value: '3' } },
    },
  },
});

describe('translateKindData: spell variants', () => {
  test('action variants keep the casting fields, damage and heightening each overrides', () => {
    const result = translate([heal]);
    const data = dataIn(result, 'heal');

    expect(data).toMatchObject({
      variants: [
        { time: { type: 'actions', cost: 'one' }, range: { type: 'touch' } },
        {
          name: 'Heal (vs. Living)',
          time: { type: 'actions', cost: 'two' },
          range: { type: 'feet', feet: 30 },
          damage: [{ key: '0', formula: '1d8+8', damageType: 'vitality', kinds: ['healing'] }],
          heightening: { type: 'interval', interval: 1, damage: [{ key: '0', formula: '1d8+8' }] },
        },
        { time: { type: 'actions', cost: 'three' }, area: { shape: 'emanation', size: 30 } },
      ],
    });
    expect(KIND_DATA[ContentKind.Spell].safeParse(data).error).toBeUndefined();
  });

  test("a spell with no casting time of its own takes the first variant's", () => {
    const sphere = spell('sPhErE0000000001', 'Thunder Sphere', {
      level: { value: 1 },
      time: { value: '' },
      overlays: {
        o1: { overlayType: 'override', sort: 1, system: { range: { value: '30 feet' }, time: { value: '2' } } },
        o2: { overlayType: 'override', sort: 2, system: { range: { value: '60 feet' }, time: { value: '3' } } },
      },
    });
    const data = dataIn(translate([sphere]), 'thunder-sphere');

    expect(data).toMatchObject({
      time: { type: 'actions', cost: 'two' },
      variants: [{ time: { cost: 'two' } }, { time: { cost: 'three' } }],
    });
    expect(KIND_DATA[ContentKind.Spell].safeParse(data).error).toBeUndefined();
  });

  test('what a variant cannot carry is reported: its traits, and a range it blanks that the spell has', () => {
    const result = translate([heal]);

    expect(gapsOf(result)).toEqual([
      { reason: KindDataGapReason.UnmappedField, field: 'overlays.o2.traits', raw: HEAL_TRAITS },
      { reason: KindDataGapReason.UnmappedValue, field: 'overlays.o3.range.value', raw: '' },
    ]);
  });

  test('damage type variants set the type of a part, and the rest of the part stays', () => {
    const breath = spell('bReAtH0000000001', 'Breathe Fire', {
      level: { value: 1 },
      time: { value: '2' },
      damage: { '0': damagePart('2d6', 'fire') },
      overlays: {
        a1: {
          name: 'Breathe Fire (Cold)',
          overlayType: 'override',
          sort: 1,
          system: { damage: { '0': { type: 'cold' } } },
        },
        a2: {
          name: 'Breathe Fire (Acid)',
          overlayType: 'override',
          sort: 2,
          system: { damage: { '0': { type: 'acid' } } },
        },
      },
    });
    const result = translate([breath]);
    const data = dataIn(result, 'breathe-fire');

    expect(data).toMatchObject({
      variants: [
        { name: 'Breathe Fire (Cold)', damage: [{ key: '0', formula: '2d6', damageType: 'cold' }] },
        { name: 'Breathe Fire (Acid)', damage: [{ key: '0', formula: '2d6', damageType: 'acid' }] },
      ],
    });
    expect(gapsOf(result)).toEqual([]);
    expect(KIND_DATA[ContentKind.Spell].safeParse(data).error).toBeUndefined();
  });

  test("a variant's defence is laid over the spell's, so a save keeps the passive defence", () => {
    const burn = spell('bUrN000000000001', 'Burn', {
      level: { value: 1 },
      time: { value: '2' },
      defense: { passive: { statistic: 'ac' }, save: { basic: true, statistic: 'reflex' } },
      overlays: { a1: { overlayType: 'override', system: { defense: { save: { basic: false, statistic: 'will' } } } } },
    });

    expect(dataIn(translate([burn]), 'burn')).toMatchObject({
      variants: [{ defense: { against: 'ac', save: { statistic: 'save:will', basic: false } } }],
    });
  });

  test('an overlay that is not an override is reported and left out', () => {
    const odd = spell('oDd0000000000001', 'Odd', {
      level: { value: 1 },
      time: { value: '2' },
      overlays: { a1: { overlayType: 'addition', system: { time: { value: '1' } } } },
    });
    const result = translate([odd]);

    expect(dataIn(result, 'odd')).not.toHaveProperty('variants');
    expect(gapsOf(result)).toEqual([
      { reason: KindDataGapReason.UnmappedValue, field: 'overlays.a1.overlayType', raw: 'addition' },
    ]);
  });

  test('fixed heightening that changes the casting time and traits carries over', () => {
    const rest = spell('pEaCe00000000001', 'Peaceful Rest', {
      level: { value: 2 },
      time: { value: '2' },
      heightening: {
        type: 'fixed',
        levels: { '5': { time: { value: '3' }, traits: { value: ['concentrate', 'manipulate'] } } },
      },
    });
    const result = translate([rest]);
    const data = dataIn(result, 'peaceful-rest');

    expect(data).toMatchObject({
      heightening: {
        type: 'fixed',
        ranks: [{ rank: 5, time: { type: 'actions', cost: 'three' }, traits: ['concentrate', 'manipulate'] }],
      },
    });
    expect(gapsOf(result)).toEqual([]);
    expect(KIND_DATA[ContentKind.Spell].safeParse(data).error).toBeUndefined();
  });
});
