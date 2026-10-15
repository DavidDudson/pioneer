import { describe, expect, test } from 'bun:test';

import { FormulaValue } from '@pioneer/rules/formula';
import { PredicateFacts } from '@pioneer/rules/predicate';
import { DamageType, NumericItemProperty, RollOption, RollOptionTail, Slug, Trait } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { alterItem } from './item-alterations';
import type { AlterableItem, AlteredItem } from './item-alterations';
import { inPlay } from './testing';

const facts = new PredicateFacts([RollOption.parse('self:effect:rage')], CORE_NAMESPACES);

function itemNumbers(pairs: readonly (readonly [NumericItemProperty, number])[]): AlterableItem['numbers'] {
  return new Map(pairs.map(([property, value]) => [property, FormulaValue.parse(value)]));
}

const STEEL_SHIELD: AlterableItem = {
  rollOptions: ['type:shield', 'trait:shield', 'slug:steel-shield', 'equipped'].map((option) =>
    RollOptionTail.parse(option),
  ),
  numbers: itemNumbers([
    [NumericItemProperty.Hardness, 5],
    [NumericItemProperty.HitPointsMax, 20],
    [NumericItemProperty.AcBonus, 2],
  ]),
  traits: [],
  damageType: undefined,
  materials: [],
  propertyRunes: [],
};

const LONGBOW: AlterableItem = {
  rollOptions: ['type:weapon', 'trait:propulsive', 'equipped'].map((option) => RollOptionTail.parse(option)),
  numbers: itemNumbers([[NumericItemProperty.RangeIncrement, 100]]),
  traits: [Trait.parse('propulsive')],
  damageType: DamageType.Piercing,
  materials: [],
  propertyRunes: [],
};

/** An item's number by property, as a plain number. */
function numberOf({ numbers }: AlteredItem, property: NumericItemProperty): number | undefined {
  return numbers.get(property);
}

const reachWeapons = ['item:type:weapon'];

/** An alteration of a weapon: the property, how it changes and to what. */
function alteration(property: string, mode: string, value: string): [object, string] {
  return [{ key: 'ItemAlteration', items: reachWeapons, property, mode, value }, 'x'];
}

/** A hardness alteration of shields that only holds while `predicate` does. */
function hardnessWhen(predicate: string): object {
  return {
    key: 'ItemAlteration',
    items: ['item:trait:shield'],
    property: 'hardness',
    mode: 'add',
    value: 2,
    predicate: [predicate],
  };
}

/** `item` after elements, each `[element, entry]`, in that order. */
function altered(item: AlterableItem, placed: readonly (readonly [object, string])[]): AlteredItem {
  const rules = placed.map(([element, entry], rule) => inPlay(element, entry, { rule }));
  return alterItem({ rules, facts }, item);
}

const reachShields = ['item:trait:shield'];

describe('alterItem: numbers', () => {
  test('add changes the number and names its origin', () => {
    const element = { key: 'ItemAlteration', items: reachShields, property: 'hardness', mode: 'add', value: 2 };

    const result = altered(STEEL_SHIELD, [[element, 'reinforcing']]);

    expect(numberOf(result, 'hardness')).toBe(7);
    expect(result.origins).toEqual([inPlay(element, 'reinforcing').origin]);
  });

  test.each([
    ['subtract', 2, 3],
    ['multiply', 2, 10],
    ['upgrade', 8, 8],
    ['upgrade', 3, 5],
    ['downgrade', 3, 3],
    ['override', 1, 1],
  ])('%s %d on hardness 5 gives %d', (mode, value, expected) => {
    const result = altered(STEEL_SHIELD, [
      [{ key: 'ItemAlteration', items: reachShields, property: 'hardness', mode, value }, 'x'],
    ]);

    expect(numberOf(result, 'hardness')).toBe(expected);
  });

  test('a number never goes below 0', () => {
    const result = altered(STEEL_SHIELD, [
      [{ key: 'ItemAlteration', items: reachShields, property: 'hardness', mode: 'subtract', value: 9 }, 'x'],
    ]);

    expect(numberOf(result, 'hardness')).toBe(0);
  });

  test('an item with no value takes one from upgrade, downgrade and override only', () => {
    const range = ['add', 'multiply', 'upgrade', 'downgrade', 'override'].map((mode) =>
      numberOf(
        altered(STEEL_SHIELD, [
          [{ key: 'ItemAlteration', items: reachShields, property: 'range-increment', mode, value: 30 }, 'x'],
        ]),
        'range-increment',
      ),
    );

    expect(range).toEqual([undefined, undefined, 30, 30, 30]);
  });

  test('a range increment is altered like any number', () => {
    const result = altered(LONGBOW, [
      [
        { key: 'ItemAlteration', items: ['item:type:weapon'], property: 'range-increment', mode: 'add', value: 20 },
        'x',
      ],
    ]);

    expect(numberOf(result, 'range-increment')).toBe(120);
  });

  test('a formula that needs the character has no value and changes nothing', () => {
    const result = altered(STEEL_SHIELD, [
      [{ key: 'ItemAlteration', items: reachShields, property: 'hardness', mode: 'add', value: '@level' }, 'x'],
    ]);

    expect(numberOf(result, 'hardness')).toBe(5);
    expect(result.origins).toEqual([]);
  });
});

describe('alterItem: which items and when', () => {
  test('an element reaches only the items its predicate over their roll options holds for', () => {
    const element = { key: 'ItemAlteration', items: reachShields, property: 'hardness', mode: 'add', value: 2 };

    expect(altered(LONGBOW, [[element, 'x']]).origins).toEqual([]);
    expect(altered(STEEL_SHIELD, [[element, 'x']]).origins).toHaveLength(1);
  });

  test("the element's own predicate reads the character", () => {
    const raging = altered(STEEL_SHIELD, [[hardnessWhen('self:effect:rage'), 'x']]);
    const calm = altered(STEEL_SHIELD, [[hardnessWhen('self:effect:calm'), 'x']]);

    expect(numberOf(raging, 'hardness')).toBe(7);
    expect(numberOf(calm, 'hardness')).toBe(5);
  });

  test('a predicate that depends on the situation changes nothing', () => {
    const result = altered(STEEL_SHIELD, [
      [
        {
          key: 'ItemAlteration',
          items: reachShields,
          property: 'hardness',
          mode: 'add',
          value: 2,
          predicate: ['target:undead'],
        },
        'x',
      ],
    ]);

    expect(numberOf(result, 'hardness')).toBe(5);
  });

  test('elements apply in the order found', () => {
    const result = altered(STEEL_SHIELD, [
      [{ key: 'ItemAlteration', items: reachShields, property: 'hardness', mode: 'multiply', value: 2 }, 'a'],
      [{ key: 'ItemAlteration', items: reachShields, property: 'hardness', mode: 'add', value: 1 }, 'b'],
    ]);

    expect(numberOf(result, 'hardness')).toBe(11);
    expect(result.origins).toHaveLength(2);
  });
});

describe('alterItem: traits, damage type, materials and runes', () => {
  test('traits are added and removed', () => {
    const added = altered(LONGBOW, [alteration('traits', 'add', 'agile')]);
    const removed = altered(LONGBOW, [alteration('traits', 'remove', 'propulsive')]);

    expect(added.traits).toEqual([Trait.parse('propulsive'), Trait.parse('agile')]);
    expect(removed.traits).toEqual([]);
  });

  test('adding a trait the item has, or removing one it lacks, changes nothing', () => {
    const result = altered(LONGBOW, [
      alteration('traits', 'add', 'propulsive'),
      alteration('traits', 'remove', 'agile'),
    ]);

    expect(result.traits).toBe(LONGBOW.traits);
    expect(result.origins).toEqual([]);
  });

  test('the damage type is overridden', () => {
    const result = altered(LONGBOW, [alteration('damage-type', 'override', 'fire')]);

    expect(result.damageType).toBe(DamageType.Fire);
  });

  test('materials and property runes are added and removed', () => {
    const result = altered(LONGBOW, [
      alteration('materials', 'add', 'cold-iron'),
      alteration('property-runes', 'add', 'flaming'),
      alteration('property-runes', 'add', 'shock'),
      alteration('property-runes', 'remove', 'flaming'),
    ]);

    expect(result.materials).toEqual([Slug.parse('cold-iron')]);
    expect(result.propertyRunes).toEqual([Slug.parse('shock')]);
  });
});
