import { describe, expect, test } from 'bun:test';

import { contentId, ContentPackId, contentPackId, PackId, Slug } from './content-id';

describe('contentPackId', () => {
  test('is stable: stored rows depend on it', () => {
    expect(contentPackId(PackId.parse('player-core'))).toBe(
      ContentPackId.parse('51bf8466-929d-56c1-9467-1d50438c6ded'),
    );
    expect(contentPackId(PackId.parse('player-core'))).not.toBe(contentPackId(PackId.parse('monster-core')));
  });

  test('never equals the id of an entry in the pack', () => {
    const pack = PackId.parse('core-rules');
    expect(contentPackId(pack)).not.toBe(contentId(pack, Slug.parse('core-rules')));
  });
});
