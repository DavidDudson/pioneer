import { PackId } from '@pioneer/rules/sdk';
import type { ContentPack, ContentPackLoader } from '@pioneer/rules/sdk';

import { bookRegistry } from './book-registry';
import { checkPackSources } from './source-check';

export { BookRegistry, bookRegistry } from './book-registry';
export { checkPackSources, packEntries, SourceCheckError, sourceIssues } from './source-check';
export type { MissourcedEntry, SourcedEntry } from './source-check';
export { sourceCoverage } from './source-coverage';
export type { BookCoverage } from './source-coverage';

/** A loader whose pack must also pass the registry source checks, so a wrongly sourced entry fails to load. */
export function checkedLoader(id: string, load: () => Promise<ContentPack>): ContentPackLoader {
  return {
    id: PackId.parse(id),
    load: async () => {
      const pack = await load();
      return checkPackSources(pack, bookRegistry);
    },
  };
}

/**
 * Every installable content pack, as lazy loaders. Packs are only fetched
 * (browser) or imported (server) when `ContentRegistry.load` is called, so a
 * new book is one new lib plus one line here. This is the only module allowed
 * to reference `@pioneer/content/*`, and only through dynamic `import()`.
 */
export const contentCatalog: readonly ContentPackLoader[] = [
  checkedLoader('core-rules', async () => {
    const { coreRules } = await import('@pioneer/content/core-rules');
    return coreRules;
  }),
  checkedLoader('player-core', async () => {
    const { playerCore } = await import('@pioneer/content/player-core');
    return playerCore;
  }),
  checkedLoader('monster-core', async () => {
    const { monsterCore } = await import('@pioneer/content/monster-core');
    return monsterCore;
  }),
];
