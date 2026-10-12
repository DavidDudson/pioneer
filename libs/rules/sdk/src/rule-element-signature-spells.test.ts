import { describe, expect, test } from 'bun:test';

import { fieldIssues } from '@pioneer/shared/kernel';
import type { FieldIssue } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { RuleElement } from './rule-element';

function issues(value: unknown): readonly FieldIssue[] {
  const result = RuleElement.safeParse(value);
  return result.success ? [] : fieldIssues(result.error.issues);
}

/** A bard's signature spells, and the same gated on a level. */
const examples: object[] = [
  { key: 'SignatureSpells', entry: 'bard' },
  { key: 'SignatureSpells', entry: 'bard', predicate: [{ gte: ['self:level', 3] }] },
];

describe('SignatureSpells element', () => {
  test.each(examples)('reads %o and encodes it back unchanged', (example) => {
    expect(z.encode(RuleElement, RuleElement.parse(example))).toStrictEqual(example);
  });

  test('names its entry, and nothing else', () => {
    expect(issues({ key: 'SignatureSpells' })).toMatchObject([{ path: ['entry'] }]);
    expect(issues({ key: 'SignatureSpells', entry: 'bard', rank: 1 })).not.toStrictEqual([]);
  });
});
