import { describe, expect, test } from 'bun:test';

import { staffMatches } from '@pioneer/rules/catalog';
import { ContentEntryFile, contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';

import { enrichStaffFile } from './staff-enrichment.ts';

const PACK = 'gm-core';
const idOf = (slug: string): string => contentId(PackId.parse(PACK), EntrySlug.parse(slug));

/** A Game Master Core entry's JSON, as a pack file holds it. */
function entry(slug: string, name: string, fields: object): object {
  return {
    id: idOf(slug),
    pack: PACK,
    slug,
    name,
    level: 1,
    rarity: 'common',
    traits: [],
    sources: [{ kind: 'book', book: 'gm-core', page: 1 }],
    description: [],
    rules: [],
    ...fields,
  };
}

const HEAL = entry('spell:heal', 'Heal', {
  kind: 'spell',
  data: {
    rank: 1,
    time: { type: 'actions', cost: 'two' },
    range: { type: 'feet', feet: 30 },
    duration: { type: 'unlimited' },
    traditions: ['divine'],
    damage: [],
  },
});

const list = (words: string): object => ({
  type: 'list',
  ordered: false,
  items: [
    [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: '1st', marks: ['strong'] },
          { type: 'text', text: ` ${words}` },
        ],
      },
    ],
  ],
});

const WEAPON = {
  bulk: 1,
  category: 'simple',
  damage: { dice: 1, die: 'd6', damageType: 'bludgeoning' },
  usage: { type: 'held', hands: 'one' },
};

function staff(slug: string, words: string, data: object = {}): object {
  return entry(`weapon:${slug}`, slug, {
    kind: 'weapon',
    traits: ['magical', 'staff'],
    description: [list(words)],
    data: { ...WEAPON, ...data },
  });
}

/** The file after the pass, with matches read from its own entries. */
function enrich(file: readonly object[]): readonly unknown[] | undefined {
  const matches = staffMatches(ContentEntryFile.parse(file));
  return enrichStaffFile(file, new Map(matches.map((match) => [match.entry, match.staff])));
}

describe('staff enrichment', () => {
  test('sets the typed spells on a staff whose list the matcher reads', () => {
    const healing = staff('healing', 'Heal');

    expect(enrich([HEAL, healing])).toStrictEqual([
      HEAL,
      staff('healing', 'Heal', { staff: [{ rank: 1, spells: [idOf('spell:heal')] }] }),
    ]);
  });

  test('leaves unmatched and corrected staves as they were', () => {
    const unknown = staff('unknown', 'Concordant Choir');
    const corrected = staff('corrected', 'Heal', { staff: [{ rank: 2, spells: [idOf('spell:heal')] }] });

    expect(enrich([HEAL, unknown, corrected])).toBeUndefined();
  });
});
