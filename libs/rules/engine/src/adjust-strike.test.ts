import { describe, expect, test } from 'bun:test';

import { FormulaValue } from '@pioneer/rules/formula';
import { PredicateFacts } from '@pioneer/rules/predicate';
import { DamageType, NumericItemProperty, RollOptionTail, Slug, Trait } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { adjustStrike } from './item-alterations';
import type { AlteredItem } from './item-alterations';
import { inPlay } from './testing';

const facts = new PredicateFacts([], CORE_NAMESPACES);

function weapon(options: readonly string[], range?: number): AlteredItem {
  return {
    rollOptions: ['type:weapon', ...options, 'equipped'].map((option) => RollOptionTail.parse(option)),
    numbers: new Map(range === undefined ? [] : [[NumericItemProperty.RangeIncrement, FormulaValue.parse(range)]]),
    traits: [Trait.parse('versatile-p')],
    damageType: DamageType.Slashing,
    materials: [],
    propertyRunes: [],
    origins: [],
  };
}

function traits(...names: readonly string[]): readonly Trait[] {
  return names.map((name) => Trait.parse(name));
}

const LONGSWORD = weapon(['slug:longsword', 'melee']);
const SHORTBOW = weapon(['slug:shortbow', 'ranged'], 60);

/** `strike` after the adjustments, each placed in order. */
function adjusted(strike: AlteredItem, elements: readonly object[]): AlteredItem {
  const rules = elements.map((element, rule) => inPlay(element, 'adjuster', { rule }));
  return adjustStrike({ rules, facts }, strike);
}

describe('adjustStrike', () => {
  test('a trait is added once and named by its origin', () => {
    const element = { key: 'AdjustStrike', property: 'traits', mode: 'add', value: 'holy' };

    const result = adjusted(LONGSWORD, [element, element]);

    expect(result.traits).toEqual(['versatile-p', 'holy'].map((trait) => Trait.parse(trait)));
    expect(result.origins).toEqual([inPlay(element, 'adjuster').origin]);
  });

  test('a trait is removed', () => {
    const result = adjusted(LONGSWORD, [
      { key: 'AdjustStrike', property: 'traits', mode: 'remove', value: 'versatile-p' },
    ]);

    expect(result.traits).toEqual([]);
  });

  test('a material and a property rune are added', () => {
    const result = adjusted(LONGSWORD, [
      { key: 'AdjustStrike', property: 'materials', mode: 'add', value: 'silver' },
      { key: 'AdjustStrike', property: 'property-runes', mode: 'add', value: 'ghost-touch' },
    ]);

    expect([result.materials, result.propertyRunes]).toEqual([[Slug.parse('silver')], [Slug.parse('ghost-touch')]]);
  });

  test('strikes limits the adjustment to weapons whose roll options satisfy it', () => {
    const element = { key: 'AdjustStrike', property: 'traits', mode: 'add', value: 'holy', strikes: ['item:ranged'] };

    expect([adjusted(LONGSWORD, [element]).traits, adjusted(SHORTBOW, [element]).traits]).toEqual([
      traits('versatile-p'),
      traits('versatile-p', 'holy'),
    ]);
  });

  test('a slug in strikes reaches only that weapon', () => {
    const element = {
      key: 'AdjustStrike',
      property: 'materials',
      mode: 'add',
      value: 'silver',
      strikes: ['item:slug:longsword'],
    };

    expect([adjusted(LONGSWORD, [element]).materials.length, adjusted(SHORTBOW, [element]).materials.length]).toEqual([
      1, 0,
    ]);
  });

  test('a pick in strikes reaches the weapon the pick named', () => {
    const picked = weapon(['picked:weapon']);
    const element = {
      key: 'AdjustStrike',
      property: 'traits',
      mode: 'add',
      value: 'holy',
      strikes: ['item:picked:weapon'],
    };

    expect([adjusted(picked, [element]).traits.length, adjusted(LONGSWORD, [element]).traits.length]).toEqual([2, 1]);
  });

  test('an adjustment whose own predicate fails changes nothing', () => {
    const element = {
      key: 'AdjustStrike',
      property: 'traits',
      mode: 'add',
      value: 'holy',
      predicate: ['self:effect:rage'],
    };

    expect(adjusted(LONGSWORD, [element])).toBe(LONGSWORD);
  });

  test.each([
    ['add', 30, 90],
    ['subtract', 20, 40],
    ['multiply', 2, 120],
    ['upgrade', 100, 100],
    ['downgrade', 10, 10],
    ['override', 15, 15],
  ])('range increment %s %d on 60 gives %d', (mode, value, expected) => {
    const result = adjusted(SHORTBOW, [{ key: 'AdjustStrike', property: 'range-increment', mode, value }]);

    expect(result.numbers.get(NumericItemProperty.RangeIncrement)).toBe(FormulaValue.parse(expected));
  });

  test('a melee weapon with no range increment takes one only from upgrade, downgrade and override', () => {
    const add = adjusted(LONGSWORD, [{ key: 'AdjustStrike', property: 'range-increment', mode: 'add', value: 10 }]);
    const override = adjusted(LONGSWORD, [
      { key: 'AdjustStrike', property: 'range-increment', mode: 'override', value: 10 },
    ]);

    expect([
      add.numbers.has(NumericItemProperty.RangeIncrement),
      override.numbers.get(NumericItemProperty.RangeIncrement),
    ]).toEqual([false, FormulaValue.parse(10)]);
  });
});
