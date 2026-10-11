import { describe, expect, test } from 'bun:test';

import { fieldIssues, message } from '@pioneer/shared/kernel';
import type { FieldIssue } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { RulesMessage } from './messages';
import { RuleElement } from './rule-element';

function issues(value: unknown): readonly FieldIssue[] {
  const result = RuleElement.safeParse(value);
  return result.success ? [] : fieldIssues(result.error.issues);
}

/** Angelkin's Empyrean, and Multilingual's two slots and its slot at master in Society. */
const examples: object[] = [
  { key: 'Language', grant: ['3f1c3a8e-6c0b-5d7e-9a51-1d2a6b0f9c11'] },
  { key: 'Language', slots: 2, access: 'uncommon' },
  { key: 'Language', slots: 1, access: 'uncommon', predicate: [{ gte: ['skill:society:rank', 3] }] },
];

describe('Language element', () => {
  test.each(examples)('reads %o and encodes it back unchanged', (example) => {
    expect(z.encode(RuleElement, RuleElement.parse(example))).toStrictEqual(example);
  });

  test('grants a language or opens slots', () => {
    expect(issues({ key: 'Language' })).toStrictEqual([
      { path: [], message: message(RulesMessage.LanguageGrantOrSlots) },
    ]);
    expect(issues({ key: 'Language', slots: 0 })).toMatchObject([{ path: ['slots'] }]);
    expect(issues({ key: 'Language', slots: 1, access: 'unique' })).toMatchObject([{ path: ['access'] }]);
  });
});
