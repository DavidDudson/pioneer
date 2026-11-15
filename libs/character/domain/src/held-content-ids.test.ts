import { describe, expect, test } from 'bun:test';

import { ContentId } from '@pioneer/rules/sdk';

import { heldContentIds } from './held-content-ids';
import { CharacterBuilder } from './testing';

const FIRST = ContentId.parse('11111111-1111-4111-8111-111111111111');
const SECOND = ContentId.parse('22222222-2222-4222-8222-222222222222');

describe('heldContentIds', () => {
  test('finds uuids at any depth, once each', () => {
    const { document } = new CharacterBuilder()
      .picking('feat:1', FIRST)
      .picking('feat:2', SECOND)
      .picking('feat:3', SECOND)
      .build();

    const found = heldContentIds(document);

    expect(found).toContain(FIRST);
    expect(found.filter((id) => id === SECOND)).toEqual([SECOND]);
  });

  test('ignores strings that are not uuids', () => {
    const { document } = new CharacterBuilder().picking('feat:1', `x${FIRST}`).build();

    expect(heldContentIds(document)).not.toContain(FIRST);
  });
});
