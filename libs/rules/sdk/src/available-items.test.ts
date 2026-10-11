import { describe, expect, test } from 'bun:test';

import { availableItems } from './available-items';
import { ContentEntry } from './content-entry';
import { contentId, EntrySlug, PackId } from './content-id';
import { filterEntries } from './facet-filter';
import { facetsFor } from './kind-facets';
import { Level } from './units';

const PACK = 'player-core';
const prose = [{ type: 'paragraph', content: [{ type: 'text', text: 'A sword.' }] }];

interface SwordFields {
  readonly slug: string;
  readonly level: number;
  readonly rarity?: string;
  readonly traits?: readonly string[];
}

/** A Player Core longsword with its level, rarity and traits changed. */
function sword({ slug, level, rarity = 'common', traits = [] }: SwordFields): ContentEntry {
  return ContentEntry.parse({
    id: contentId(PackId.parse(PACK), EntrySlug.parse(`weapon:${slug}`)),
    slug: `weapon:${slug}`,
    pack: PACK,
    kind: 'weapon',
    name: slug,
    level,
    rarity,
    traits,
    sources: [{ kind: 'book', book: 'player-core', page: 1 }],
    description: prose,
    rules: [],
    data: {
      price: { coins: { gp: 1 } },
      bulk: 1,
      category: 'martial',
      group: 'sword',
      damage: { dice: 1, die: 'd8', damageType: 'slashing' },
      usage: { type: 'held', hands: 'one' },
    },
  });
}

const facets = facetsFor(['weapon']);
const available = (entries: readonly ContentEntry[], level: number): readonly string[] =>
  filterEntries(entries, facets, availableItems(Level.parse(level))).map((entry) => entry.name);

describe('availableItems', () => {
  test('keeps items of the character level or lower', () => {
    const entries = [
      sword({ slug: 'plain', level: 0 }),
      sword({ slug: 'even', level: 3 }),
      sword({ slug: 'above', level: 4 }),
    ];

    expect(available(entries, 3)).toStrictEqual(['plain', 'even']);
  });

  test('hides unique items and keeps uncommon and rare ones', () => {
    const entries = [
      sword({ slug: 'uncommon', level: 1, rarity: 'uncommon' }),
      sword({ slug: 'rare', level: 1, rarity: 'rare' }),
      sword({ slug: 'unique', level: 1, rarity: 'unique' }),
    ];

    expect(available(entries, 1)).toStrictEqual(['uncommon', 'rare']);
  });

  test('hides artifacts at any level', () => {
    const entries = [
      sword({ slug: 'artifact', level: 0, traits: ['artifact'] }),
      sword({ slug: 'magical', level: 0, traits: ['magical'] }),
    ];

    expect(available(entries, 20)).toStrictEqual(['magical']);
  });
});
