import { describe, expect, it } from 'bun:test';

import { CompanionTier, contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';

import { companionTiersFromFeats } from './companion-tier-feats';

const id = (slug: string): string => contentId(PackId.parse('player-core'), EntrySlug.parse(slug));

describe('companionTiersFromFeats', () => {
  it('holds no tier without an upgrade feat', () => {
    expect([...companionTiersFromFeats([id('feat:power-attack')])]).toStrictEqual([]);
  });

  it.each(['feat:mature-animal-companion-druid', 'feat:mature-animal-companion-ranger'])(
    'reads %s as mature',
    (slug) => {
      expect([...companionTiersFromFeats([id(slug)])]).toStrictEqual([CompanionTier.Mature]);
    },
  );

  it.each(['feat:specialized-companion-druid', 'feat:specialized-companion-ranger'])(
    'reads %s as specialized',
    (slug) => {
      expect([...companionTiersFromFeats([id(slug)])]).toStrictEqual([CompanionTier.Specialized]);
    },
  );

  it('lowers the tier when the feat is gone', () => {
    const held = [id('feat:mature-animal-companion-ranger')];

    expect(companionTiersFromFeats(held).has(CompanionTier.Mature)).toBe(true);
    expect(companionTiersFromFeats([]).has(CompanionTier.Mature)).toBe(false);
  });
});
