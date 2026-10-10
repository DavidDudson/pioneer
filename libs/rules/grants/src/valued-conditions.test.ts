import { describe, expect, test } from 'bun:test';

import { ConditionValue, contentId, ContentId, ContentKind, PackId } from '@pioneer/rules/sdk';
import { array, assert, constant, integer, oneof, property, shuffledSubarray } from 'fast-check';
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
      return namesOf(resolve(content, roots).items);
    };
    expect(at(2)).toEqual(['frightened', 'steady', 'shaken']);
    expect(at(1)).toEqual(['frightened', 'steady', 'composed']);
    expect(at(1, 2)).toEqual(['frightened', 'steady', 'shaken']);
  });

  test('from two packs under one slug, sets the highest value of either alone', () => {
    const homebrew: GrantEntry = {
      ...frightened,
      id: ContentId.parse(contentId(PackId.parse('homebrew'), frightened.slug)),
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

  test('granted by another entry sets no value, as grants carry none', () => {
    const content = [condition('dying', [grantOf('unconscious')]), condition('unconscious')];
    expect(conditionOptions(content, [afflicted('dying', 2)])).toEqual([
      'self:condition:dying',
      'self:condition:dying:2',
      'self:condition:unconscious',
    ]);
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
});
