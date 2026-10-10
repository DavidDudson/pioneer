import { contentPackFromContents, PackId } from '@pioneer/rules/sdk';
import type { ContentPack, ContentPackLoader, PackContents, PackContentsLoader } from '@pioneer/rules/sdk';

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

/** Like `checkedLoader`, for the pack's checked files rather than the `ContentPack` they describe. */
function checkedContents(id: string, load: () => Promise<PackContents>): PackContentsLoader {
  return {
    id: PackId.parse(id),
    load: async () => {
      const contents = await load();
      checkPackSources(contentPackFromContents(contents), bookRegistry);
      return contents;
    },
  };
}

/**
 * Every official pack's files under `content/packs` (ADR-0003), as lazy loaders. The content seed upserts them into
 * Postgres; a new pack is one directory there plus one line here.
 */
export const officialPacks: readonly PackContentsLoader[] = [
  checkedContents('core-rules', coreRulesPack),
  checkedContents('player-core', playerCorePack),
  checkedContents('monster-core', monsterCorePack),
];

/**
 * Every installable content pack, as lazy loaders over the official packs' JSON. Packs are only fetched (browser) or
 * read (server) when `ContentRegistry.load` is called.
 */
export const contentCatalog: readonly ContentPackLoader[] = officialPacks.map(({ id, load }): ContentPackLoader => ({
  id,
  load: async () => {
    const contents = await load();
    return contentPackFromContents(contents);
  },
}));
