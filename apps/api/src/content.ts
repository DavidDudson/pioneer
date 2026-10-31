import { PackAccessPolicy } from '@pioneer/homebrew/application';
import { DrizzlePackDirectory } from '@pioneer/homebrew/infrastructure';
import { officialPacks } from '@pioneer/rules/catalog';
import {
  ContentRepository,
  contentRoutes,
  ContentSearchRepository,
  contentSearchRoutes,
  seedContentPacks,
  StoredContentBundles,
} from '@pioneer/rules/infrastructure';
import type { Clock } from '@pioneer/shared/kernel';
import type { ContractRouter, RequestAuthenticator } from '@pioneer/shared/server';

import { CampaignPackEnablementDirectory } from './campaign-pack-enablement-directory';
import type { Database } from './database';
import { SearchableHomebrewPacks } from './searchable-homebrew-packs';

/**
 * The content part of the composition root: the browser's bundles of the official packs, public (ADR-0007), and
 * search over them, which also covers the homebrew packs the signed-in caller may read.
 */
export function content(db: Database, authenticator: RequestAuthenticator): ContractRouter['app'] {
  const homebrew = new SearchableHomebrewPacks(
    new DrizzlePackDirectory(db),
    new PackAccessPolicy(new CampaignPackEnablementDirectory(db)),
  );
  return contentRoutes(new StoredContentBundles(new ContentRepository(db))).use(
    contentSearchRoutes(new ContentSearchRepository(db), homebrew, authenticator),
  );
}

/**
 * Upserts the official packs bundled into this build into the content tables, then logs one line per pack. Runs
 * after migrations: from `pioneer-api migrate`, which is all a deploy runs (ADR-0029), before serving when
 * MIGRATE_ON_START is set, and in dev. `pioneer-api content-seed` runs it alone. A pack whose hash is already stored
 * is skipped, so running it again is cheap.
 */
export async function seedOfficialContent(db: Database, clock: Clock, log: (line: string) => void): Promise<void> {
  const seeds = await seedContentPacks(db, officialPacks, clock);
  for (const { pack, outcome, version, removed } of seeds) {
    log(`content pack ${pack}: ${outcome} (version ${version}, ${removed} removed)`);
  }
}
