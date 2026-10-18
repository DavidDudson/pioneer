import { describe, expect, test } from 'bun:test';

import { BattleFormElement, Level } from '@pioneer/rules/sdk';
import { assert, integer, property } from 'fast-check';

import { heightened } from './battle-form-heighten';

const RANK_MAX = 10;

const SPEAR = { slug: 'spear', category: 'unarmed', damage: { dice: 2, die: 'd8', damageType: 'piercing' } };
const FORM = BattleFormElement.parse({
  key: 'BattleForm',
  form: {
    speeds: { land: 30 },
    senses: [{ sense: '16b42c38-9373-58ec-a7ac-2221bb17a71c' }],
    skills: [{ skill: 'skill:athletics', modifier: 10 }],
    strikes: [SPEAR],
    resistances: [{ type: 'poison', value: 10 }],
    traits: ['plant'],
  },
  brackets: [
    {
      start: 5,
      armorClass: { modifier: '19 + @level', ignoreCheckPenalty: true },
      size: 'large',
      skills: [{ skill: 'skill:athletics', modifier: 19 }],
      strikes: [{ slug: 'spear', damage: { modifier: 11 }, modifier: 17 }],
      tempHP: 12,
    },
    {
      start: 6,
      armorClass: { modifier: '22 + @level' },
      size: 'huge',
      speeds: { fly: 20 },
      skills: [{ skill: 'skill:athletics', modifier: 22 }],
      strikes: [{ slug: 'spear', damage: { modifier: 16 }, modifier: 21, traits: ['unarmed', 'reach-20'] }],
      resistances: [{ type: 'acid', value: 5 }],
      tempHP: 24,
    },
  ],
});

type Form = BattleFormElement['form'];

/** Branded values as the plain JSON they come from, so a test compares them with literals. */
function plain(value: unknown): unknown {
  return structuredClone(value);
}

function count(list: readonly unknown[] | undefined): number {
  return list === undefined ? 0 : list.length;
}

function at(rank: number): Form {
  return heightened(FORM, Level.parse(rank));
}

describe('heightened', () => {
  test('without a rank, or below the first bracket, it is the base form', () => {
    expect(heightened(FORM, undefined)).toEqual(FORM.form);
    expect(at(4)).toEqual(FORM.form);
  });

  test('a form with no brackets is its base form at any rank', () => {
    const unheightened = BattleFormElement.parse({ key: 'BattleForm', form: { speeds: { land: 25 } } });

    expect(heightened(unheightened, Level.parse(RANK_MAX))).toEqual(unheightened.form);
  });

  test('a bracket lays its statistics over the form: scalars replace, lists merge by name', () => {
    const form = at(5);

    expect(plain([form.size, form.tempHP])).toEqual(['large', 12]);
    expect(plain(form.armorClass)).toEqual({ modifier: '19 + @level', ignoreCheckPenalty: true });
    expect(plain(form.skills)).toEqual([{ skill: 'skill:athletics', modifier: 19 }]);
    expect(form.senses).toEqual(FORM.form.senses);
    expect(plain(form.speeds)).toEqual({ land: 30 });
  });

  test('a Strike keeps its dice and takes the damage bonus and attack modifier of the bracket', () => {
    expect(plain(at(5).strikes)).toEqual([{ ...SPEAR, modifier: 17, damage: { ...SPEAR.damage, modifier: 11 } }]);
  });

  test('brackets stack from the lowest: the armour flag of rank 5 survives the rank 6 modifier', () => {
    const form = at(6);

    expect(plain(form.armorClass)).toEqual({ modifier: '22 + @level', ignoreCheckPenalty: true });
    expect(plain(form.size)).toBe('huge');
    expect(plain(form.speeds)).toEqual({ land: 30, fly: 20 });
    expect(plain(form.strikes)).toMatchObject([{ modifier: 21, traits: ['unarmed', 'reach-20'] }]);
    expect(plain(form.resistances)).toEqual([
      { type: 'poison', value: 10 },
      { type: 'acid', value: 5 },
    ]);
  });

  test('a rank above the last bracket is the last bracket’s form', () => {
    expect(at(RANK_MAX)).toEqual(at(6));
  });
});

describe('heightened: properties', () => {
  test('a higher rank never drops a sense, a resistance or a Strike the form has', () => {
    assert(
      property(integer({ min: 1, max: RANK_MAX }), integer({ min: 1, max: RANK_MAX }), (first, second) => {
        const low = at(Math.min(first, second));
        const high = at(Math.max(first, second));

        expect(count(high.senses)).toBeGreaterThanOrEqual(count(low.senses));
        expect(count(high.resistances)).toBeGreaterThanOrEqual(count(low.resistances));
        expect(count(high.strikes)).toBe(count(low.strikes));
      }),
    );
  });
});
