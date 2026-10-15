import { describe, expect, test } from 'bun:test';

import { fieldIssues } from '@pioneer/shared/kernel';
import type { FieldIssue } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { RuleElement } from './rule-element';

function issues(value: unknown): readonly FieldIssue[] {
  const result = RuleElement.safeParse(value);
  return result.success ? [] : fieldIssues(result.error.issues);
}

const HAUNTING_HYMN = '8c3e6b1e-2a54-5f43-9b49-5ce7c7a2b2a1';
const FEAR = '2f6a1d0c-7b3e-5c94-8e21-4a9d6f0b3c7e';

/** A bloodline's gifts, and one gated on a draconic exemplar picked. */
const examples: object[] = [
  {
    key: 'RepertoireSpells',
    entry: 'sorcerer',
    spells: [
      { rank: 'cantrip', spell: HAUNTING_HYMN },
      { rank: 1, spell: FEAR },
    ],
  },
  {
    key: 'RepertoireSpells',
    entry: 'sorcerer',
    spells: [{ rank: 2, spell: FEAR }],
    predicate: ['draconic-exemplar:diabolic'],
  },
];

/** A `RepertoireSpells` element naming one spell at `rank`. */
function spells(rank: unknown): object {
  return { key: 'RepertoireSpells', entry: 'sorcerer', spells: [{ rank, spell: FEAR }] };
}

describe('RepertoireSpells element', () => {
  test.each(examples)('reads %o and encodes it back unchanged', (example) => {
    expect(z.encode(RuleElement, RuleElement.parse(example))).toStrictEqual(example);
  });

  test('names its entry and at least one spell', () => {
    expect(issues({ key: 'RepertoireSpells', spells: [{ rank: 1, spell: FEAR }] })).toMatchObject([
      { path: ['entry'] },
    ]);
    expect(issues({ key: 'RepertoireSpells', entry: 'sorcerer', spells: [] })).toMatchObject([{ path: ['spells'] }]);
  });

  test('takes a cantrip or a rank of 1 to 10 for each spell, and no other', () => {
    expect(issues(spells(10))).toStrictEqual([]);
    expect(issues(spells(0))).not.toStrictEqual([]);
    expect(issues(spells(11))).not.toStrictEqual([]);
    expect(issues(spells('highest'))).not.toStrictEqual([]);
  });
});
