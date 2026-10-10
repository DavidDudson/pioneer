import { officialPacks } from '@pioneer/rules/catalog';
import { seedContentPacks } from '@pioneer/rules/infrastructure';
import type { Clock } from '@pioneer/shared/kernel';

import type { Database } from './database';

/**
 * Upserts the official packs bundled into this build into the content tables, then logs one line per pack. Runs
 * after migrations: from `pioneer-api content-seed` in a deploy, before serving when MIGRATE_ON_START is set, and in
 * dev. A pack whose hash is already stored is skipped, so running it again is cheap.
 */
export async function seedOfficialContent(db: Database, clock: Clock, log: (line: string) => void): Promise<void> {
  const seeds = await seedContentPacks(db, officialPacks, clock);
  for (const { pack, outcome, version, removed } of seeds) {
    log(`content pack ${pack}: ${outcome} (version ${version}, ${removed} removed)`);
  }
}
