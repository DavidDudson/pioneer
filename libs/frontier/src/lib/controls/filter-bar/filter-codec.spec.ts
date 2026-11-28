import { array, assert, integer, property, string } from 'fast-check';
import { describe, expect, it } from 'vitest';

import { defaultOperator, FilterKind, FilterOperator } from './filter-bar.types';
import type { FilterCondition, FilterField } from './filter-bar.types';
import { filterCodec } from './filter-codec';

const FIELDS: ReadonlyArray<FilterField> = [
  { id: 'traits', label: 'Traits', kind: FilterKind.Set },
  { id: 'level', label: 'Level', kind: FilterKind.Range },
  { id: 'consumable', label: 'Consumable', kind: FilterKind.Flag },
];

const CODEC = filterCodec(() => FIELDS);

const condition = (field: string, operator: FilterOperator, ...values: Array<string>): FilterCondition => ({
  field,
  operator,
  values,
});

describe('filter codec', () => {
  it('leaves the default operator unwritten', () => {
    expect(CODEC.encode([condition('traits', FilterOperator.Is, 'fire')])).toBe('traits:fire');
    expect(CODEC.encode([condition('level', FilterOperator.Is, '3')])).toBe('level:3');
    expect(CODEC.encode([condition('consumable', FilterOperator.Is, 'yes')])).toBe('consumable:yes');
  });

  it('marks the other operators', () => {
    expect(CODEC.encode([condition('traits', FilterOperator.IsNot, 'evil')])).toBe('traits:!evil');
    expect(CODEC.encode([condition('traits', FilterOperator.IsAnyOf, 'fire', 'cold')])).toBe('traits:fire,cold');
    expect(CODEC.encode([condition('level', FilterOperator.Between, '1', '5')])).toBe('level:1..5');
    expect(CODEC.encode([condition('level', FilterOperator.Between, '', '3')])).toBe('level:..3');
  });

  it('allows several conditions on one field', () => {
    const conditions = [
      condition('traits', FilterOperator.Is, 'fire'),
      condition('traits', FilterOperator.IsNot, 'evil'),
      condition('traits', FilterOperator.IsNot, 'undead'),
    ];

    expect(CODEC.encode(conditions)).toBe('traits:fire~traits:!evil~traits:!undead');
    expect(CODEC.decode(CODEC.encode(conditions))).toStrictEqual(conditions);
  });

  it('reads old links', () => {
    expect(CODEC.decode('traits:fire,!evil~level:1..5')).toStrictEqual([
      condition('traits', FilterOperator.Is, 'fire'),
      condition('traits', FilterOperator.IsNot, 'evil'),
      condition('level', FilterOperator.Between, '1', '5'),
    ]);
    expect(CODEC.decode('traits:fire,cold')).toStrictEqual([
      condition('traits', FilterOperator.IsAnyOf, 'fire', 'cold'),
    ]);
  });

  it('drops what does not read', () => {
    expect(CODEC.decode('')).toStrictEqual([]);
    expect(CODEC.decode('nope:x~:x~traits~traits:~level:abc~level:1..2..3~level:..~traits:fire')).toStrictEqual([
      condition('traits', FilterOperator.Is, 'fire'),
    ]);
  });

  it('drops conditions it cannot write', () => {
    expect(
      CODEC.encode([
        condition('nope', FilterOperator.Is, 'x'),
        condition('traits', FilterOperator.Between, '1', '2'),
        condition('traits', FilterOperator.Is),
        condition('level', FilterOperator.Between, '', ''),
      ]),
    ).toBe('');
  });

  it('follows fields that change', () => {
    let fields: ReadonlyArray<FilterField> = [];
    const codec = filterCodec(() => fields);

    expect(codec.decode('traits:fire')).toStrictEqual([]);
    fields = FIELDS;
    expect(codec.decode('traits:fire')).toHaveLength(1);
  });

  it('starts each kind on its first operator', () => {
    expect(defaultOperator(FilterKind.Range)).toBe(FilterOperator.Is);
  });

  it('round-trips values holding its own characters', () => {
    const values = array(string({ minLength: 1 }), { minLength: 2, maxLength: 4 });

    assert(
      property(values, (list) => {
        const anyOf = [condition('traits', FilterOperator.IsAnyOf, ...list)];
        const excluded = list.map((each) => condition('traits', FilterOperator.IsNot, each));

        expect(CODEC.decode(CODEC.encode(anyOf))).toStrictEqual(anyOf);
        expect(CODEC.decode(CODEC.encode(excluded))).toStrictEqual(excluded);
      }),
    );
  });

  it('round-trips one value', () => {
    assert(
      property(string({ minLength: 1 }), (value) => {
        const is = [condition('traits', FilterOperator.Is, value)];

        expect(CODEC.decode(CODEC.encode(is))).toStrictEqual(is);
      }),
    );
  });

  it('round-trips ranges', () => {
    assert(
      property(integer({ min: 0, max: 99 }), integer({ min: 0, max: 99 }), (min, max) => {
        const between = [condition('level', FilterOperator.Between, String(min), String(max))];
        const only = [condition('level', FilterOperator.Is, String(min))];

        expect(CODEC.decode(CODEC.encode(between))).toStrictEqual(between);
        expect(CODEC.decode(CODEC.encode(only))).toStrictEqual(only);
      }),
    );
  });
});
