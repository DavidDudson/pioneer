import { ContentKind, packContentsFromFiles } from '@pioneer/rules/sdk';
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

/** The pack as a delivery serves it. */
export const BROWSE_LOADER: PackContentsLoader = {
  id: BROWSE_PACK.id,
  load: async () => packContentsFromFiles(BROWSE_PACK.manifest, [BROWSE_PACK.otherEntries]),
};
