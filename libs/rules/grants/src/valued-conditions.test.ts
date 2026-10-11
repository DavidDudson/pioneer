import { describe, expect, test } from 'bun:test';

import { ConditionValue, contentId, ContentId, ContentKind, entrySlug, PackId } from '@pioneer/rules/sdk';
import { array, assert, boolean, constant, integer, oneof, property, record, shuffledSubarray } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import type { GrantEntry, GrantRoot } from './grant-entry';
import type { GrantedItem } from './grant-walk';
import { resolveGrants } from './resolve-grants';
import type { GrantResolution } from './resolve-grants';
import { afflicted, entry, grantOf, inputsOf, picked } from './testing/builders';

const condition = (slug: string, rules: readonly object[] = []): GrantEntry => ({
  ...entry(slug, rules),
  kind: ContentKind.Condition,
});

const frightened = condition('frightened');
/** A condition that carries a value, so a grant of it gives one. */
const clumsy: GrantEntry = { ...condition('clumsy'), valued: true };

/** A grant of `slug` while `predicate` holds. */
const grantWhen = (slug: string, predicate: unknown): object => ({ ...grantOf(slug), predicate });

function resolve(entries: readonly GrantEntry[], roots: readonly GrantRoot[]): GrantResolution {
  return resolveGrants(inputsOf({ entries, roots }));
}

const namesOf = (items: readonly GrantedItem[]): string[] => items.map((item) => String(item.entry.name));

/** The condition options `result` sets. */
function conditionsOf(result: GrantResolution): string[] {
  return result.rollOptions.map(String).filter((option) => option.startsWith('self:condition:'));
}

/** The condition options the character has once `entries` resolve from `roots`. */
const conditionOptions = (entries: readonly GrantEntry[], roots: readonly GrantRoot[]): string[] =>
  conditionsOf(resolve(entries, roots));

describe('a valued condition', () => {
  test('sets its value beside its slug', () => {
    expect(conditionOptions([frightened], [afflicted('frightened', 2)])).toEqual([
      'self:condition:frightened',
      'self:condition:frightened:2',
    ]);
  });

  test('without a value sets its slug alone', () => {
    expect(conditionOptions([frightened], [afflicted('frightened')])).toEqual(['self:condition:frightened']);
  });

  test.each([
    [[afflicted('frightened', 1), afflicted('frightened', 3)]],
    [[afflicted('frightened', 3), afflicted('frightened', 1)]],
    [[afflicted('frightened'), afflicted('frightened', 3)]],
  ])('arriving twice keeps the highest value and reports the duplicate (%#)', (roots) => {
    const result = resolve([frightened], roots);
    expect(conditionsOf(result)).toEqual(['self:condition:frightened', 'self:condition:frightened:3']);
    expect(namesOf(result.items)).toEqual(['frightened']);
    expect(namesOf(result.duplicates)).toEqual(['frightened']);
  });

  test('a comparison reads its value', () => {
    const content = [
      frightened,
      entry('steady', [
        grantWhen('shaken', [{ gte: ['self:condition:frightened', 2] }]),
        grantWhen('composed', [{ lte: ['self:condition:frightened', 1] }]),
      ]),
      entry('shaken'),
      entry('composed'),
    ];
    const at = (...values: number[]): string[] => {
      const roots = [picked('steady'), ...values.map((value) => afflicted('frightened', value))];
      // Which entries are granted, in name order: the walk's order follows ids.
      return namesOf(resolve(content, roots).items).toSorted();
    };
    expect(at(2)).toEqual(['frightened', 'shaken', 'steady']);
    expect(at(1)).toEqual(['composed', 'frightened', 'steady']);
    expect(at(1, 2)).toEqual(['frightened', 'shaken', 'steady']);
  });

  test('from two packs under one slug, sets the highest value of either alone', () => {
    const homebrew: GrantEntry = {
      ...frightened,
      id: ContentId.parse(contentId(PackId.parse('homebrew'), entrySlug(ContentKind.Condition, frightened.slug))),
    };
    const roots: GrantRoot[] = [
      afflicted('frightened', 3),
      { entry: homebrew.id, hop: { kind: 'condition', condition: homebrew.id, value: ConditionValue.parse(1) } },
    ];
    expect(conditionOptions([frightened, homebrew], roots)).toEqual([
      'self:condition:frightened',
      'self:condition:frightened:3',
    ]);
  });

  test('granted by another entry without a value arrives at 1', () => {
    const content = [condition('encumbered', [grantOf('clumsy')]), clumsy];
    expect(conditionOptions(content, [afflicted('encumbered')])).toEqual([
      'self:condition:clumsy',
      'self:condition:clumsy:1',
      'self:condition:encumbered',
    ]);
  });

  test('granted with a value arrives at that value', () => {
    const content = [condition('curse', [{ ...grantOf('clumsy'), value: 3 }]), clumsy];
    expect(conditionOptions(content, [afflicted('curse')])).toEqual([
      'self:condition:clumsy',
      'self:condition:clumsy:3',
      'self:condition:curse',
    ]);
  });

  test('granted several times keeps the highest value, a root value among them', () => {
    const content = [
      condition('curse', [{ ...grantOf('clumsy'), value: 2 }]),
      condition('encumbered', [grantOf('clumsy')]),
      clumsy,
    ];
    const roots = [afflicted('encumbered'), afflicted('curse')];
    expect(conditionOptions(content, roots)).toContain('self:condition:clumsy:2');
    expect(conditionOptions(content, [...roots, afflicted('clumsy', 4)])).toContain('self:condition:clumsy:4');
    expect(conditionOptions(content, roots).filter((option) => option.startsWith('self:condition:clumsy:'))).toEqual([
      'self:condition:clumsy:2',
    ]);
  });

  test('on the character holds the highest value it arrived with, whichever arrived first', () => {
    const content = [
      condition('curse', [{ ...grantOf('clumsy'), value: 3 }]),
      condition('encumbered', [grantOf('clumsy')]),
      clumsy,
    ];
    const valueOf = (roots: readonly GrantRoot[]): number | undefined =>
      resolve(content, roots).items.find((item) => item.entry.slug === 'clumsy')?.value;
    expect(valueOf([afflicted('encumbered'), afflicted('curse')])).toBe(3);
    expect(valueOf([afflicted('encumbered'), afflicted('clumsy', 2)])).toBe(2);
    expect(valueOf([afflicted('clumsy', 4), afflicted('curse')])).toBe(4);
  });

  test('granted when it carries no value sets its slug alone, whatever the grant says', () => {
    const content = [condition('grabbed', [{ ...grantOf('off-guard'), value: 2 }]), condition('off-guard')];
    expect(conditionOptions(content, [afflicted('grabbed')])).toEqual([
      'self:condition:grabbed',
      'self:condition:off-guard',
    ]);
  });

  test('a grant of an entry that is no condition gives it no value', () => {
    const content = [
      condition('curse', [{ ...grantOf('weakness'), value: 2 }]),
      { ...entry('weakness'), valued: true },
    ];
    const weakness = resolve(content, [afflicted('curse')]).items.find((item) => item.entry.slug === 'weakness');
    expect(weakness?.value).toBeUndefined();
  });
});

/** Highest value a drawn root takes; few values, so roots often share one. */
const VALUE_MAX = 4;
const ROOTS_MAX = 6;

type Values = readonly (number | undefined)[];

/** Each root's value (none for an unvalued one), and the same roots in another order. */
const valuedRoots: Arbitrary<[Values, Values]> = array(
  oneof(constant(undefined), integer({ min: 1, max: VALUE_MAX })),
  { minLength: 1, maxLength: ROOTS_MAX },
).chain((values) => shuffledSubarray(values, { minLength: values.length }).map((order) => [values, order]));

/** One arrival of clumsy: put on as a root, or granted by a condition of its own; with a value or without. */
interface Arrival {
  readonly granted: boolean;
  readonly value: number | undefined;
}

const drawnValue: Arbitrary<number | undefined> = oneof(constant(undefined), integer({ min: 1, max: VALUE_MAX }));
const arrivals: Arbitrary<Arrival[]> = array(record({ granted: boolean(), value: drawnValue }), {
  minLength: 1,
  maxLength: ROOTS_MAX,
});

/** The condition that grants clumsy for each granted arrival, `granter-<index>`. */
function grantersOf(drawn: readonly Arrival[]): GrantEntry[] {
  return drawn.flatMap(({ granted, value }, index) =>
    granted ? [condition(`granter-${index}`, [{ ...grantOf('clumsy'), value }])] : [],
  );
}

/** A root for each arrival: its granter, or clumsy put on with its value. */
function arrivalRoots(drawn: readonly Arrival[]): GrantRoot[] {
  return drawn.map(({ granted, value }, index) =>
    granted ? afflicted(`granter-${index}`) : afflicted('clumsy', value),
  );
}

/** The value each arrival brings: a grant's, else 1; a root's own, if it has one. */
function broughtBy({ granted, value }: Arrival): number[] {
  if (granted) {
    return [value ?? 1];
  }
  return value === undefined ? [] : [value];
}

/** What clumsy holds once `drawn` arrive: its highest value, and the options it sets. */
interface ClumsyState {
  readonly value: ConditionValue | undefined;
  readonly options: readonly string[];
}

function expectedClumsy(drawn: readonly Arrival[]): ClumsyState {
  const given = drawn.flatMap((arrival) => broughtBy(arrival));
  if (given.length === 0) {
    return { value: undefined, options: ['self:condition:clumsy'] };
  }
  const highest = Math.max(...given);
  return {
    value: ConditionValue.parse(highest),
    options: ['self:condition:clumsy', `self:condition:clumsy:${highest}`],
  };
}

/** What clumsy holds once `drawn` resolve. */
function resolvedClumsy(drawn: readonly Arrival[]): ClumsyState {
  const result = resolve([clumsy, ...grantersOf(drawn)], arrivalRoots(drawn));
  return clumsyOf(result);
}

function clumsyOf(result: GrantResolution): ClumsyState {
  return {
    value: result.items.find((item) => item.entry.slug === 'clumsy')?.value,
    options: conditionsOf(result).filter((option) => option.startsWith('self:condition:clumsy')),
  };
}

/** _frightened_ once for each of `values`. */
const rootsOf = (values: Values): GrantRoot[] => values.map((value) => afflicted('frightened', value));

/** The options frightened sets from roots with `values`: its slug, and its highest value if any has one. */
function expectedOf(values: Values): string[] {
  const given = values.filter((value) => value !== undefined);
  const valued = given.length === 0 ? [] : [`self:condition:frightened:${Math.max(...given)}`];
  return ['self:condition:frightened', ...valued];
}

describe('valued condition properties', () => {
  test('the condition sets its highest value alone, whatever order its roots come in', () => {
    assert(
      property(valuedRoots, ([values, order]) => {
        expect(conditionOptions([frightened], rootsOf(values))).toEqual(expectedOf(values));
        expect(resolve([frightened], rootsOf(order)).rollOptions).toEqual(
          resolve([frightened], rootsOf(values)).rollOptions,
        );
      }),
    );
  });

  test('a valued condition granted and put on holds its highest arrival, a grant without a value at 1', () => {
    assert(
      property(arrivals, (drawn) => {
        expect(resolvedClumsy(drawn)).toEqual(expectedClumsy(drawn));
      }),
    );
  });
});
