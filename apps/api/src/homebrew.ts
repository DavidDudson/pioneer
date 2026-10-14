import {
  HomebrewBundleService,
  HomebrewPackService,
  PackAccessPolicy,
  PackDependencyService,
} from '@pioneer/homebrew/application';
import {
  DrizzleDependencyUsageDirectory,
  DrizzleHomebrewPackRepository,
  DrizzlePackDependencyRepository,
  DrizzlePackDirectory,
  homebrewBundleRoutes,
  homebrewRoutes,
} from '@pioneer/homebrew/infrastructure';
import { ContentRepository, StoredPackBundles } from '@pioneer/rules/infrastructure';
import type { Clock } from '@pioneer/shared/kernel';
import type { ContractRouter, RequestAuthenticator } from '@pioneer/shared/server';

import { CampaignPackEnablementDirectory } from './campaign-pack-enablement-directory';
import type { Database } from './database';
import { StoredPackBundleSource } from './stored-pack-bundle-source';
import { UserAuthorDirectory } from './user-author-directory';

/** The homebrew context's part of the composition root: services and routes. */
export function homebrew(db: Database, clock: Clock, authenticator: RequestAuthenticator): ContractRouter['app'] {
  const packs = new DrizzleHomebrewPackRepository(db);
  const directory = new DrizzlePackDirectory(db);
  const dependencies = new DrizzlePackDependencyRepository(db);
  const enablement = new CampaignPackEnablementDirectory(db);
  const service = new HomebrewPackService(
    { packs, authors: new UserAuthorDirectory(db), enablement, directory, dependencies },
    clock,
  );
  const dependencyService = new PackDependencyService({
    packs,
    directory,
    dependencies,
    usage: new DrizzleDependencyUsageDirectory(db),
    enablement,
  });
  const stored = new StoredPackBundles(new ContentRepository(db));
  const bundles = new HomebrewBundleService({
    directory,
    access: new PackAccessPolicy(enablement),
    bundles: new StoredPackBundleSource(stored),
  });
  return homebrewRoutes({ packs: service, dependencies: dependencyService }, authenticator).use(
    homebrewBundleRoutes(bundles, authenticator),
  );
}
