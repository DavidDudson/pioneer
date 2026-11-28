import { array, assert, integer, property, string } from 'fast-check';
import { describe, expect, it } from 'vitest';

import { defaultOperator, FilterKind, FilterOperator, operatorsFor } from './filter-bar.types';
import type { FilterCondition, FilterField } from './filter-bar.types';
import { filterCodec } from './filter-codec';

const FIELDS: ReadonlyArray<FilterField> = [
  { id: 'traits', label: 'Traits', kind: FilterKind.Set },
  { id: 'level', label: 'Level', kind: FilterKind.Range },
  { id: 'consumable', label: 'Consumable', kind: FilterKind.Flag },
  { id: 'name', label: 'Name', kind: FilterKind.Text },
  { id: 'released', label: 'Released', kind: FilterKind.Date },
];

const CODEC = filterCodec(() => FIELDS);

const condition = (field: string, operator: FilterOperator, ...values: Array<string>): FilterCondition => ({
  field,
  operator,
  values,
});

describe('filter codec', () => {
  it('writes a date span and one day like a range', () => {
    expect(CODEC.encode([condition('released', FilterOperator.Between, '2026-01-02', '2026-03-04')])).toBe(
      'released:2026-01-02..2026-03-04',
    );
    expect(CODEC.encode([condition('released', FilterOperator.Is, '2026-01-02')])).toBe('released:2026-01-02');
    expect(CODEC.decode('released:..2026-03-04')).toStrictEqual([
      condition('released', FilterOperator.Between, '', '2026-03-04'),
    ]);
  });

  it('leaves out a date that is not a day', () => {
    expect(CODEC.encode([condition('released', FilterOperator.Is, 'soon')])).toBe('');
    expect(CODEC.decode('released:3..5')).toStrictEqual([]);
  });

  it('writes typed text as a value, with its special characters escaped', () => {
    expect(CODEC.encode([condition('name', FilterOperator.Is, 'a:b')])).toBe('name:a%3Ab');
    expect(CODEC.decode('name:a%3Ab')).toStrictEqual([condition('name', FilterOperator.Is, 'a:b')]);
    expect(CODEC.encode([condition('name', FilterOperator.IsNot, 'kyra')])).toBe('name:!kyra');
  });

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

  it('starts every kind on the first operator it offers', () => {
    const kinds: ReadonlyArray<FilterKind> = [FilterKind.Set, FilterKind.Range, FilterKind.Flag];

    expect(kinds.map((kind) => defaultOperator(kind))).toStrictEqual(kinds.map((kind) => operatorsFor(kind)[0]));
  });

  it('reads flags, and drops operators a field lacks', () => {
    expect(CODEC.decode('consumable:yes~consumable:!no')).toStrictEqual([
      condition('consumable', FilterOperator.Is, 'yes'),
      condition('consumable', FilterOperator.IsNot, 'no'),
    ]);
    expect(CODEC.decode('consumable:yes,no')).toStrictEqual([]);
    expect(CODEC.encode([condition('consumable', FilterOperator.IsAnyOf, 'yes', 'no')])).toBe('');
    expect(CODEC.encode([condition('level', FilterOperator.IsNot, '3')])).toBe('');
  });

  it('writes a shape it cannot keep as its canonical equivalent', () => {
    const anyOfOne = CODEC.encode([condition('traits', FilterOperator.IsAnyOf, 'fire')]);
    const notTwo = CODEC.encode([condition('traits', FilterOperator.IsNot, 'a', 'b')]);

    expect(CODEC.decode(anyOfOne)).toStrictEqual([condition('traits', FilterOperator.Is, 'fire')]);
    expect(CODEC.decode(notTwo)).toStrictEqual([
      condition('traits', FilterOperator.IsNot, 'a'),
      condition('traits', FilterOperator.IsNot, 'b'),
    ]);
  });

  it('leaves out empty values and bounds that are not plain numbers', () => {
    expect(CODEC.encode([condition('traits', FilterOperator.IsNot, '')])).toBe('');
    expect(CODEC.encode([condition('traits', FilterOperator.IsAnyOf, 'a', '')])).toBe('traits:a');
    expect(CODEC.encode([condition('level', FilterOperator.Between, '1.', '5')])).toBe('');
    expect(CODEC.encode([condition('level', FilterOperator.Is, 'abc')])).toBe('');
    expect(CODEC.decode('level:0x10~level:1e3..5~level: 3')).toStrictEqual([]);
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
