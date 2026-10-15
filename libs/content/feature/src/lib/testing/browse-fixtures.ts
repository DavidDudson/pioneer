import { packContentsFromFiles } from '@pioneer/rules/sdk';
import type { ContentPack, PackContentsLoader } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';

/** A small official-looking pack of feats and spells, for specs of the browser. */
export const BROWSE_PACK: ContentPack = new ContentPackBuilder()
  .withId('browse-test')
  .withFeat('shield-block', { level: 1, traits: ['fighter', 'general'] })
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
