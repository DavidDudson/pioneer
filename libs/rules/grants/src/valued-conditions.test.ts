import { describe, expect, test } from 'bun:test';

import { ContentKind } from '@pioneer/rules/sdk';

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

  test('granted by another entry sets no value, as grants carry none', () => {
    const content = [condition('grabbed', [grantOf('off-guard')]), condition('off-guard')];
    expect(conditionOptions(content, [afflicted('grabbed', 1)])).toEqual([
      'self:condition:grabbed',
      'self:condition:grabbed:1',
      'self:condition:off-guard',
    ]);
  });
});
