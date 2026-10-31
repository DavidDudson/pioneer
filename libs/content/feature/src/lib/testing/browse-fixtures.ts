import { ContentEntry, contentId, ContentKind, EntrySlug, packContentsFromFiles, PackId } from '@pioneer/rules/sdk';
import type { ContentPack, PackContentsLoader } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';

/** An id no pack holds, for a reference that has nothing to open. */
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

const BUILDER = new ContentPackBuilder().withId('browse-test');

/** A small official-looking pack of feats and spells, for specs of the browser. */
export const BROWSE_PACK: ContentPack = BUILDER.withFeat('shield-block', {
  level: 1,
  traits: ['fighter', 'general'],
  // Refers to a feat in the pack and to one nothing holds.
  description: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Raise a shield, as with ' },
        { type: 'ref', id: BUILDER.idOf(ContentKind.Feat, 'power-attack') },
        { type: 'text', text: ' or ' },
        { type: 'ref', id: UNKNOWN_ID, label: 'Mystery Feat' },
        { type: 'text', text: '.' },
      ],
    },
  ],
})
  .withFeat('power-attack', { level: 1, traits: ['fighter', 'flourish'] })
  .withFeat('toughness', { level: 1, traits: ['general'] })
  .withFeat('incredible-initiative', { level: 3, traits: ['general'] })
  .withSpell('fireball', { rank: 3, traditions: ['arcane', 'primal'], traits: ['fire'] })
  .withSpell('heal', { rank: 1, traditions: ['divine', 'primal'], traits: ['healing'] })
  .build();

const CREATURE_SLUG = EntrySlug.parse('creature:giant-rat');

/** A creature, which a pack files apart from its other entries: a stat block with a Strike. */
const GIANT_RAT = ContentEntry.parse({
  id: contentId(PackId.parse('browse-test'), CREATURE_SLUG),
  pack: 'browse-test',
  kind: ContentKind.Creature,
  slug: CREATURE_SLUG,
  name: 'Giant Rat',
  level: -1,
  rarity: 'common',
  traits: ['animal'],
  sources: [{ kind: 'book', book: 'monster-core', page: 1 }],
  description: [{ type: 'paragraph', content: [{ type: 'text', text: 'A rat the size of a dog.' }] }],
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
    strikes: [
      {
        name: 'jaws',
        range: 'melee',
        bonus: 7,
        damage: [{ dice: 1, die: 'd4', damageType: 'piercing' }],
        traits: [],
      },
    ],
  },
});

/** The pack as a delivery serves it. */
export const BROWSE_LOADER: PackContentsLoader = {
  id: BROWSE_PACK.id,
  load: async () => packContentsFromFiles(BROWSE_PACK.manifest, [BROWSE_PACK.otherEntries, [GIANT_RAT]]),
};
