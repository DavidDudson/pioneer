import { describe, expect, test } from 'bun:test';

import { fieldIssues } from '@pioneer/shared/kernel';
import type { FieldIssue } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { RuleElement } from './rule-element';

function issues(value: unknown): readonly FieldIssue[] {
  const result = RuleElement.safeParse(value);
  return result.success ? [] : fieldIssues(result.error.issues);
}

const HEAL = '8c3e6b1e-2a54-5f43-9b49-5ce7c7a2b2a1';
const FIREBALL = '2f6a1d0c-7b3e-5c94-8e21-4a9d6f0b3c7e';

/** A healing font's heal, and part of the School of Battle Magic's curriculum. */
const examples: object[] = [
  {
    key: 'PoolSpells',
    entry: 'cleric',
    pool: 'divine-font',
    spells: [HEAL],
    predicate: ['divine-font:heal'],
  },
  {
    key: 'PoolSpells',
    entry: 'wizard',
    pool: 'curriculum',
    spells: [HEAL, FIREBALL],
  },
];

describe('PoolSpells element', () => {
  test.each(examples)('reads %o and encodes it back unchanged', (example) => {
    expect(z.encode(RuleElement, RuleElement.parse(example))).toStrictEqual(example);
  });

  test('a pool takes at least one spell, each once', () => {
    const pool = { key: 'PoolSpells', entry: 'wizard', pool: 'curriculum' };
    expect(issues({ ...pool, spells: [] })).toMatchObject([{ path: ['spells'] }]);
    expect(issues({ ...pool, spells: [HEAL, HEAL] })).toMatchObject([{ path: ['spells', 1] }]);
  });

  test('names its entry and pool', () => {
    expect(issues({ key: 'PoolSpells', pool: 'curriculum', spells: [HEAL] })).toMatchObject([{ path: ['entry'] }]);
    expect(issues({ key: 'PoolSpells', entry: 'wizard', spells: [HEAL] })).toMatchObject([{ path: ['pool'] }]);
  });
});
