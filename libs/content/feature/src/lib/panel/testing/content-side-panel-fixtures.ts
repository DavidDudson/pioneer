import { ContentEntry, contentId, ContentKind, EntrySlug, packContentsFromFiles, PackId } from '@pioneer/rules/sdk';
import type { ContentPack, PackContentsLoader } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';

const SLUG = EntrySlug.parse('statistic:acrobatics');

/** A skill's statistic entry, as the core rules pack files it: its description names the key attribute and the actions. */
function acrobatics(pack: string): ContentEntry {
  return ContentEntry.parse({
    id: contentId(PackId.parse(pack), SLUG),
    pack,
    kind: ContentKind.Statistic,
    slug: SLUG,
    name: 'Acrobatics',
    rarity: 'common',
    traits: [],
    sources: [{ kind: 'book', book: 'player-core' }],
    description: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Acrobatics covers balance and agility.' },
          { type: 'text', text: ' ' },
          { type: 'text', text: 'Key attribute: ', marks: ['strong'] },
          { type: 'text', text: 'Dexterity.' },
          { type: 'text', text: ' ' },
          { type: 'text', text: 'Actions: ', marks: ['strong'] },
          { type: 'text', text: 'Balance, Tumble Through.' },
        ],
      },
    ],
    rules: [],
    data: { selector: 'skill:acrobatics', domains: ['check'], base: '@attr.dex', kind: 'check', keyAttribute: 'dex' },
  });
}

/** The pack the side panel spec reads: three feats, one with a description, and a skill's statistic entry. */
const PACK: ContentPack = new ContentPackBuilder()
  .withId('side-panel-test')
  .withFeat('power-attack', {
    level: 1,
    traits: [],
    description: [{ type: 'paragraph', content: [{ type: 'text', text: 'Strike with all your might.' }] }],
  })
  .withFeat('attack-of-opportunity', { level: 1, traits: [] })
  .withFeat('toughness', { level: 1, traits: [] })
  .build();

export const LOADER: PackContentsLoader = {
  id: PACK.id,
  load: async () => packContentsFromFiles(PACK.manifest, [PACK.otherEntries, [acrobatics(PACK.id)]]),
};
