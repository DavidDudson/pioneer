import { describe, expect, test } from 'bun:test';

import { SpellData } from './spell';

const BASE = { rank: 2, traditions: ['primal'], time: { type: 'actions', cost: 'two' }, damage: [] };
const ANT = '0864651a-fc5b-52be-99a6-6f40369fa731';
const BEAR = '848026fb-0722-5bea-b8de-834d61ed43c4';

function issuesOf(extra: object): readonly object[] {
  const parsed = SpellData.safeParse({ ...BASE, ...extra });
  return parsed.success ? [] : parsed.error.issues.map(({ path }) => ({ path }));
}

describe('a spell that puts effects on the caster', () => {
  test('lists them by content id', () => {
    expect(issuesOf({ effects: [ANT, BEAR] })).toStrictEqual([]);
  });

  test('lists none, or one twice, only as a mistake', () => {
    expect(issuesOf({ effects: [] })).toStrictEqual([{ path: ['effects'] }]);
    expect(issuesOf({ effects: [ANT, ANT] })).toStrictEqual([{ path: ['effects', 1] }]);
  });
});
