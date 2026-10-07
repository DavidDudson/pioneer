import type { ContentPackLoader } from '@pioneer/rules/sdk';

/**
 * Every installable content pack, as lazy loaders. Packs are only fetched
 * (browser) or imported (server) when `ContentRegistry.load` is called, so a
 * new book is one new lib plus one line here. This is the only module allowed
 * to reference `@pioneer/content/*`, and only through dynamic `import()`.
 */
export const contentCatalog: readonly ContentPackLoader[] = [
  {
    id: 'player-core',
    load: async () => {
      const { playerCore } = await import('@pioneer/content/player-core');
      return playerCore;
    },
  },
  {
    id: 'monster-core',
    load: async () => {
      const { monsterCore } = await import('@pioneer/content/monster-core');
      return monsterCore;
    },
  },
];
