import { describe, expect, test } from 'bun:test';

import { ContentEntry, contentId, ContentKey, EntrySlug, PackId } from '@pioneer/rules/sdk';

import { staffCoverage } from './staff-coverage';

const PACK = 'gm-core';
const SPELL = contentId(PackId.parse(PACK), EntrySlug.parse('spell:heal'));
const WEAPON_DATA = {
  bulk: 1,
  category: 'simple',
  damage: { dice: 1, die: 'd6', damageType: 'bludgeoning' },
  usage: { type: 'held', hands: 'one' },
};

interface ItemFields {
  readonly name: string;
  readonly kind: string;
  readonly traits: readonly string[];
  readonly data: object;
}

/** A Game Master Core weapon or item with `traits` and `data`. */
function item({ name, kind, traits, data }: ItemFields): ContentEntry {
  const slug = `${kind}:${name}`;
  return ContentEntry.parse({
    id: contentId(PackId.parse(PACK), EntrySlug.parse(slug)),
    pack: PACK,
    slug,
    name,
    level: 1,
    rarity: 'common',
    traits,
    sources: [{ kind: 'book', book: 'gm-core', page: 1 }],
    description: [],
    rules: [],
    kind,
    data,
  });
}

const typed = { staff: [{ rank: 1, spells: [SPELL] }] };

describe('staff coverage', () => {
  test('counts staves and lists those with no typed spells', () => {
    const entries = [
      item({ name: 'typed', kind: 'weapon', traits: ['magical', 'staff'], data: { ...WEAPON_DATA, ...typed } }),
      item({ name: 'printed', kind: 'weapon', traits: ['magical', 'staff'], data: WEAPON_DATA }),
      item({ name: 'lute', kind: 'equipment', traits: ['staff'], data: { bulk: 1 } }),
      item({ name: 'quarterstaff', kind: 'weapon', traits: [], data: WEAPON_DATA }),
      item({ name: 'coda', kind: 'equipment', traits: ['staff'], data: { bulk: 1, ...typed } }),
    ];

    expect(staffCoverage(entries)).toStrictEqual({
      staves: 4,
      withoutSpells: ['gm-core/equipment:lute', 'gm-core/weapon:printed'].map((key) => ContentKey.parse(key)),
    });
  });

  test('an empty pack has nothing to cover', () => {
    expect(staffCoverage([])).toStrictEqual({ staves: 0, withoutSpells: [] });
  });
});
