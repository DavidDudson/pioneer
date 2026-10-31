import { describe, expect, test } from 'bun:test';

import { ContentId } from '@pioneer/rules/sdk';

import { heldContentIds } from './held-content-ids';

const FIRST = ContentId.parse('11111111-1111-4111-8111-111111111111');
const SECOND = ContentId.parse('22222222-2222-4222-8222-222222222222');

describe('heldContentIds', () => {
  test('finds uuids at any depth, once each', () => {
    const found = heldContentIds({
      class: FIRST,
      inventory: { items: [{ item: SECOND }, { item: SECOND }] },
      name: 'Ada',
      level: 3,
    });
    expect([...found].toSorted()).toEqual([FIRST, SECOND]);
  });

  test('ignores strings that are not uuids', () => {
    expect(heldContentIds({ name: 'not-a-uuid', note: `x${FIRST}` })).toEqual([]);
  });
});
