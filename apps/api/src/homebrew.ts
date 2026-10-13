import { HomebrewPackService, PackDependencyService } from '@pioneer/homebrew/application';
import {
  DrizzleDependencyUsageDirectory,
  DrizzleHomebrewPackRepository,
  DrizzlePackDependencyRepository,
  DrizzlePackDirectory,
  homebrewRoutes,
} from '@pioneer/homebrew/infrastructure';
import type { Clock } from '@pioneer/shared/kernel';
import type { ContractRouter, RequestAuthenticator } from '@pioneer/shared/server';

import { CampaignPackEnablementDirectory } from './campaign-pack-enablement-directory';
import type { Database } from './database';
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
  return homebrewRoutes({ packs: service, dependencies: dependencyService }, authenticator);
}
