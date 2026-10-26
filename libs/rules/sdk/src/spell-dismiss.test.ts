import { describe, expect, test } from 'bun:test';

import { SpellData } from './spell';

const BASE = { rank: 1, traditions: ['arcane'], time: { type: 'actions', cost: 'two' }, damage: [] };
const NOTE = [{ type: 'paragraph', content: [{ type: 'text', text: 'A reaction when an ally hits.' }] }];

function issuesOf(extra: object): readonly object[] {
  const parsed = SpellData.safeParse({ ...BASE, ...extra });
  return parsed.success ? [] : parsed.error.issues.map(({ path }) => ({ path }));
}

describe('a spell that can be dismissed', () => {
  test('takes the Dismiss action, or has a note on how it ends early', () => {
    expect(issuesOf({ dismiss: true })).toStrictEqual([]);
    expect(issuesOf({ dismissNote: NOTE })).toStrictEqual([]);
  });

  test('cannot do both', () => {
    const parsed = SpellData.safeParse({ ...BASE, dismiss: true, dismissNote: NOTE });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.map(({ path }) => path)).toStrictEqual([['dismissNote']]);
  });
});
