import { describe, expect, test } from 'bun:test';

import { ActionData } from './action';

const ANT = '0864651a-fc5b-52be-99a6-6f40369fa731';
const BEAR = '848026fb-0722-5bea-b8de-834d61ed43c4';

function issuesOf(extra: object): readonly object[] {
  const parsed = ActionData.safeParse({ cost: 'one', ...extra });
  return parsed.success ? [] : parsed.error.issues.map(({ path }) => ({ path }));
}

describe('an action that puts effects on the user', () => {
  test('lists them by content id, or by content id and the predicate that offers them', () => {
    expect(issuesOf({ effects: [ANT, { effect: BEAR, predicate: ['feat:werecreature-dedication'] }] })).toStrictEqual(
      [],
    );
  });

  test('lists none, or one twice, only as a mistake', () => {
    expect(issuesOf({ effects: [] })).toStrictEqual([{ path: ['effects'] }]);
    expect(issuesOf({ effects: [ANT, ANT] })).toStrictEqual([{ path: ['effects', 1] }]);
  });
});
