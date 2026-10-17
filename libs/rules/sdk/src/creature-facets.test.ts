import { describe, expect, test } from 'bun:test';

import { ContentEntry } from './content-entry';
import { contentId, EntrySlug, PackId } from './content-id';
import { facetValues } from './facet';
import type { FacetDefinition } from './facet';
import { facetsFor } from './kind-facets';

const prose = [{ type: 'paragraph', content: [{ type: 'text', text: 'A creature.' }] }];

function creature(slug: string, role: string, size: string): ContentEntry {
  return ContentEntry.parse({
    id: contentId(PackId.parse('monster-core'), EntrySlug.parse(`creature:${slug}`)),
    pack: 'monster-core',
    kind: 'creature',
    slug: `creature:${slug}`,
    name: slug,
    level: 1,
    rarity: 'common',
    traits: ['humanoid'],
    sources: [{ kind: 'book', book: 'monster-core', page: 1 }],
    description: prose,
    rules: [],
    data: {
      role,
      size,
      perception: 5,
      attributes: { str: 1, dex: 1, con: 1, int: 0, wis: 0, cha: 0 },
      armorClass: 15,
      saves: { fortitude: 5, reflex: 5, will: 5 },
      hitPoints: 20,
      immunities: [],
      weaknesses: [],
      resistances: [],
      speed: 25,
    },
  });
}

function creatureFacet(id: string): FacetDefinition {
  const facet = facetsFor(['creature']).find((candidate) => candidate.id === id);
  if (facet === undefined) {
    throw new Error(`No creature facet ${id}`);
  }
  return facet;
}

describe('creature facets', () => {
  test('a creature list filters by role and size besides the common facets', () => {
    const ids = facetsFor(['creature']).map((facet) => String(facet.id));

    expect(ids).toContain('role');
    expect(ids).toContain('size');
    expect(ids).toContain('level');
    expect(ids).toContain('traits');
  });

  test('reads a creature’s role and size', () => {
    const guard = creature('guard', 'npc', 'medium');

    expect(facetValues(guard, creatureFacet('role')).map(String)).toStrictEqual(['npc']);
    expect(facetValues(guard, creatureFacet('size')).map(String)).toStrictEqual(['medium']);
  });
});
