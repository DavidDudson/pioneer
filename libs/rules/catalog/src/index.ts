import { contentPackFromContents, PackId } from '@pioneer/rules/sdk';
import type { ContentPack, ContentPackLoader, PackContents, PackContentsLoader } from '@pioneer/rules/sdk';

import { bookRegistry } from './book-registry';
import {
  coreRulesPack,
  divineMysteriesPack,
  gmCorePack,
  monsterCorePack,
  playerCorePack,
  treasureVaultPack,
} from './json-packs';
import { checkPackSources } from './source-check';

export { BookRegistry, bookRegistry } from './book-registry';
export { checkPackSources, packEntries, SourceCheckError, sourceIssues } from './source-check';
export { FOUNDRY_IMPORTS, foundryReleaseUrl } from './foundry-imports';
export type { FoundryImport } from './foundry-imports';
export type { MissourcedEntry, SourcedEntry } from './source-check';
export { sourceCoverage } from './source-coverage';
export type { BookCoverage } from './source-coverage';
export { prerequisiteCoverage } from './prerequisite-coverage';
export type { PrerequisiteCoverage } from './prerequisite-coverage';
export { triggerCoverage } from './trigger-coverage';
export type { TriggerCoverage } from './trigger-coverage';
export { entryAction, matchTrigger, triggerMatches } from './trigger-matcher';
export { prerequisiteMatches } from './prerequisite-matcher';
export type { PrerequisiteMatch } from './prerequisite-matcher';
export type { RefNames, TriggerMatch } from './trigger-matcher';

/**
 * A loader whose pack must also pass the registry source checks, so a wrongly sourced entry fails to load. The pack
 * files never change while the process runs, so it reads and checks them once: Player Core alone takes seconds.
 */
export function checkedLoader(id: string, load: () => Promise<PackContents>): PackContentsLoader {
  let checked: Promise<PackContents> | undefined = undefined;
  const loadChecked = async (): Promise<PackContents> => {
    const contents = await load();
    checkPackSources(contentPackFromContents(contents), bookRegistry);
    return contents;
  };
  return {
    id: PackId.parse(id),
    load: async () => {
      checked ??= loadChecked();
      return checked;
    },
  };
}

/**
 * Every official pack's files under `content/packs` (ADR-0003), as lazy loaders. The content seed upserts them into
 * Postgres; a new pack is one directory there plus one line here.
 */
export const officialPacks: readonly PackContentsLoader[] = [
  checkedLoader('core-rules', coreRulesPack),
  checkedLoader('player-core', playerCorePack),
  checkedLoader('monster-core', monsterCorePack),
  checkedLoader('divine-mysteries', divineMysteriesPack),
  checkedLoader('treasure-vault', treasureVaultPack),
  checkedLoader('gm-core', gmCorePack),
];

/** `load`'s pack as a `ContentPack`, built once: a pack's definitions never change while the process runs. */
function packLoader({ id, load }: PackContentsLoader): ContentPackLoader {
  let pack: Promise<ContentPack> | undefined = undefined;
  const build = async (): Promise<ContentPack> => contentPackFromContents(await load());
  return {
    id,
    load: async () => {
      pack ??= build();
      return pack;
    },
  };
}

/**
 * Every installable content pack, as lazy loaders over the official packs' JSON. Packs are only fetched (browser) or
 * read (server) when `ContentRegistry.load` is called.
 */
export const contentCatalog: readonly ContentPackLoader[] = officialPacks.map((loader) => packLoader(loader));
