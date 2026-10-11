import { describe, expect, test } from 'bun:test';

import {
  contentId,
  ContentPackId,
  contentPackId,
  EntrySlug,
  entrySlug,
  PackId,
  slugKind,
  slugName,
} from './content-id';

describe('contentPackId', () => {
  test('is stable: stored rows depend on it', () => {
    expect(contentPackId(PackId.parse('player-core'))).toBe(
      ContentPackId.parse('51bf8466-929d-56c1-9467-1d50438c6ded'),
    );
    expect(contentPackId(PackId.parse('player-core'))).not.toBe(contentPackId(PackId.parse('monster-core')));
  });

  test('never equals the id of an entry in the pack', () => {
    const pack = PackId.parse('core-rules');
    expect(contentPackId(pack)).not.toBe(contentId(pack, EntrySlug.parse('trait:core-rules')));
  });
});

describe('EntrySlug', () => {
  test.each(['ancestry:human', 'class-feature:shield-block', 'variant-rule:proficiency-without-level', 'trait:goblin'])(
    '%s is an entry slug, its kind and name round-tripping',
    (text) => {
      const slug = EntrySlug.parse(text);
      expect(entrySlug(slugKind(slug), slugName(slug))).toBe(slug);
    },
  );

  test.each(['human', 'ancestry:', ':human', 'ancestry:hu:man', 'ancestor:human', 'Ancestry:human', 'ancestry:Human'])(
    '%s is not an entry slug',
    (text) => {
      expect(EntrySlug.safeParse(text).success).toBe(false);
    },
  );
});
