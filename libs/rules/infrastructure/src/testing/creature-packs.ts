import { contentId, EntrySlug, packContentsFromFiles, PackId } from '@pioneer/rules/sdk';
import type { PackContents } from '@pioneer/rules/sdk';

/** A pack holding one creature, level -1 as the weakest ones are, named `name`. */
export function creaturePack(pack: string, name: string): PackContents {
  const slug = EntrySlug.parse(`creature:${name.toLowerCase()}`);
  const packFile = { id: pack, title: 'Test Pack', publisher: 'Pioneer', license: 'homebrew' };
  return packContentsFromFiles(packFile, [
    [
      {
        id: contentId(PackId.parse(pack), slug),
        pack,
        kind: 'creature',
        slug,
        name,
        level: -1,
        rarity: 'common',
        traits: ['animal'],
        sources: [{ kind: 'book', book: 'monster-core', page: 1 }],
        description: [{ type: 'paragraph', content: [{ type: 'text', text: 'Gnaws at stored grain.' }] }],
        rules: [],
        data: {
          role: 'monster',
          size: 'small',
          perception: 4,
          attributes: { str: 0, dex: 3, con: 1, int: -4, wis: 1, cha: -2 },
          armorClass: 14,
          saves: { fortitude: 5, reflex: 7, will: 3 },
          hitPoints: 8,
          immunities: [],
          weaknesses: [],
          resistances: [],
          speed: 20,
        },
      },
    ],
  ]);
}
