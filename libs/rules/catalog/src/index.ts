import { PackId } from '@pioneer/rules/sdk';
import type { ContentPack, ContentPackLoader } from '@pioneer/rules/sdk';

import { bookRegistry } from './book-registry';
import { coreRulesPack, monsterCorePack, playerCorePack } from './json-packs';
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
 * Every installable content pack, as lazy loaders over the JSON under `content/packs` (ADR-0003). Packs are only
 * fetched (browser) or read (server) when `ContentRegistry.load` is called, so a new pack is one directory there
 * plus one line here.
 */
export const contentCatalog: readonly ContentPackLoader[] = [
  checkedLoader('core-rules', coreRulesPack),
  checkedLoader('player-core', playerCorePack),
  checkedLoader('monster-core', monsterCorePack),
];
