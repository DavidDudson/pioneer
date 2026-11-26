import { describe, expect, test } from 'bun:test';

import { ContentEntry } from './content-entry';
import { contentId, entrySlug, PackId, Slug } from './content-id';
import { ContentKind } from './content-kind';

const slug = entrySlug(ContentKind.CompanionSpecies, Slug.parse('wolf'));

const species = {
  id: contentId(PackId.parse('core'), slug),
  pack: 'core',
  slug,
  kind: ContentKind.CompanionSpecies,
  name: 'Wolf',
  rarity: 'common',
  traits: [],
  sources: [{ kind: 'web', url: 'https://example.com/wolf' }],
  description: [],
  rules: [],
  data: {
    block: {
      size: 'small',
      attributes: { str: 2, dex: 2, con: 1, int: -4, wis: 1, cha: 0 },
      ancestryHp: 8,
      extraSkill: 'survival',
      speed: 35,
      attacks: [{ slug: 'jaws', attribute: 'str', damage: { dice: 1, die: 'd8', damageType: 'piercing' } }],
    },
  },
};

describe('companion species entry', () => {
  test('accepts a stat block', () => {
    expect(ContentEntry.safeParse(species).error?.issues).toBeUndefined();
  });

  test('rejects data without a block', () => {
    expect(ContentEntry.safeParse({ ...species, data: {} }).success).toBe(false);
  });
});
