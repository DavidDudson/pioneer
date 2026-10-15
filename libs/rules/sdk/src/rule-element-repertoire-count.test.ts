import { describe, expect, test } from 'bun:test';

import { fieldIssues } from '@pioneer/shared/kernel';
import type { FieldIssue } from '@pioneer/shared/kernel';

import { RuleElement } from './rule-element';

function issues(value: unknown): readonly FieldIssue[] {
  const result = RuleElement.safeParse(value);
  return result.success ? [] : fieldIssues(result.error.issues);
}

describe('RepertoireCount element', () => {
  test('accepts a count of repertoire spells at a rank, gated by a predicate', () => {
    expect(issues({ key: 'RepertoireCount', entry: 'bard', rank: 10, value: 2 })).toStrictEqual([]);
    expect(
      issues({ key: 'RepertoireCount', entry: 'bard', rank: 10, value: 2, predicate: [{ gte: ['self:level', 19] }] }),
    ).toStrictEqual([]);
  });

  test('needs an entry, a rank from 1 to 10 and a count of at least one', () => {
    expect(issues({ key: 'RepertoireCount', rank: 10, value: 2 })).toMatchObject([{ path: ['entry'] }]);
    expect(issues({ key: 'RepertoireCount', entry: 'bard', rank: 11, value: 2 })).toMatchObject([{ path: ['rank'] }]);
    expect(issues({ key: 'RepertoireCount', entry: 'bard', rank: 'cantrip', value: 2 })).toMatchObject([
      { path: ['rank'] },
    ]);
    expect(issues({ key: 'RepertoireCount', entry: 'bard', rank: 10, value: 0 })).toMatchObject([{ path: ['value'] }]);
  });
});
