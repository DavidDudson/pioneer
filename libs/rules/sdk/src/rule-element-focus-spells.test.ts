import { describe, expect, test } from 'bun:test';

import { fieldIssues } from '@pioneer/shared/kernel';
import type { FieldIssue } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { RuleElement } from './rule-element';

function issues(value: unknown): readonly FieldIssue[] {
  const result = RuleElement.safeParse(value);
  return result.success ? [] : fieldIssues(result.error.issues);
}

const FIRE_RAY = '8c3e6b1e-2a54-5f43-9b49-5ce7c7a2b2a1';
const COURAGEOUS_ANTHEM = '2f6a1d0c-7b3e-5c94-8e21-4a9d6f0b3c7e';

/** A bard's first composition spells, and a domain spell gated on the domain picked. */
const examples: object[] = [
  { key: 'FocusSpells', entry: 'bard-focus', spells: [COURAGEOUS_ANTHEM, FIRE_RAY] },
  { key: 'FocusSpells', entry: 'cleric-focus', spells: [FIRE_RAY], predicate: ['domain-initiate:fire'] },
];

describe('FocusSpells element', () => {
  test.each(examples)('reads %o and encodes it back unchanged', (example) => {
    expect(z.encode(RuleElement, RuleElement.parse(example))).toStrictEqual(example);
  });

  test('names its entry and at least one spell, each once', () => {
    expect(issues({ key: 'FocusSpells', spells: [FIRE_RAY] })).toMatchObject([{ path: ['entry'] }]);
    expect(issues({ key: 'FocusSpells', entry: 'cleric-focus', spells: [] })).toMatchObject([{ path: ['spells'] }]);
    expect(issues({ key: 'FocusSpells', entry: 'cleric-focus', spells: [FIRE_RAY, FIRE_RAY] })).not.toStrictEqual([]);
  });

  test('names no Focus Points: the pool follows from the spells', () => {
    expect(issues({ key: 'FocusSpells', entry: 'cleric-focus', spells: [FIRE_RAY], points: 1 })).not.toStrictEqual([]);
  });
});
