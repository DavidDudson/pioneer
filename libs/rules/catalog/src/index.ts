import { PackId } from '@pioneer/rules/sdk';
import type { ContentPackLoader } from '@pioneer/rules/sdk';

/**
 * Every installable content pack, as lazy loaders. Packs are only fetched
 * (browser) or imported (server) when `ContentRegistry.load` is called, so a
 * new book is one new lib plus one line here. This is the only module allowed
 * to reference `@pioneer/content/*`, and only through dynamic `import()`.
 */
export const contentCatalog: readonly ContentPackLoader[] = [
  {
    id: PackId.parse('core-rules'),
    load: async () => {
      const { coreRules } = await import('@pioneer/content/core-rules');
      return coreRules;
    },
  },
  {
    id: PackId.parse('player-core'),
    load: async () => {
      const { playerCore } = await import('@pioneer/content/player-core');
      return playerCore;
    },
  },
  {
    id: PackId.parse('monster-core'),
    load: async () => {
      const { monsterCore } = await import('@pioneer/content/monster-core');
      return monsterCore;
    },
  },
];
