import { describe, expect, test } from 'bun:test';

import { fieldIssues } from '@pioneer/shared/kernel';
import type { FieldIssue } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { RuleElement } from './rule-element';

function issues(value: unknown): readonly FieldIssue[] {
  const result = RuleElement.safeParse(value);
  return result.success ? [] : fieldIssues(result.error.issues);
}

const OAKEN_RESILIENCE = '8c3e6b1e-2a54-5f43-9b49-5ce7c7a2b2a1';
const ILL_OMEN = '2f6a1d0c-7b3e-5c94-8e21-4a9d6f0b3c7e';

/** A feat's innate spell, and one gated on a pick. */
const examples: object[] = [
  { key: 'InnateSpells', entry: 'grown-of-oak', spells: [{ rank: 2, spell: OAKEN_RESILIENCE }] },
  {
    key: 'InnateSpells',
    entry: 'fey-influence',
    spells: [{ rank: 1, spell: ILL_OMEN }],
    predicate: ['fey-influence:cursed-bluebird'],
  },
];

/** An `InnateSpells` element naming one spell at `rank`. */
function spells(rank: unknown): object {
  return { key: 'InnateSpells', entry: 'grown-of-oak', spells: [{ rank, spell: ILL_OMEN }] };
}

describe('InnateSpells element', () => {
  test.each(examples)('reads %o and encodes it back unchanged', (example) => {
    expect(z.encode(RuleElement, RuleElement.parse(example))).toStrictEqual(example);
  });

  test('names its entry and at least one spell', () => {
    expect(issues({ key: 'InnateSpells', spells: [{ rank: 1, spell: ILL_OMEN }] })).toMatchObject([
      { path: ['entry'] },
    ]);
    expect(issues({ key: 'InnateSpells', entry: 'grown-of-oak', spells: [] })).toMatchObject([{ path: ['spells'] }]);
  });

  test('takes a cantrip or a rank of 1 to 10 for each spell, and no other', () => {
    expect(issues(spells('cantrip'))).toStrictEqual([]);
    expect(issues(spells(10))).toStrictEqual([]);
    expect(issues(spells(0))).not.toStrictEqual([]);
    expect(issues(spells(11))).not.toStrictEqual([]);
  });
});
