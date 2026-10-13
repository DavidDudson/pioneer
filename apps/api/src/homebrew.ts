import { HomebrewPackService } from '@pioneer/homebrew/application';
import { DrizzleHomebrewPackRepository, homebrewRoutes } from '@pioneer/homebrew/infrastructure';
import type { Clock } from '@pioneer/shared/kernel';
import type { ContractRouter, RequestAuthenticator } from '@pioneer/shared/server';

import { CampaignPackEnablementDirectory } from './campaign-pack-enablement-directory';
import type { Database } from './database';
import { UserAuthorDirectory } from './user-author-directory';

/** The homebrew context's part of the composition root: service and routes. */
export function homebrew(db: Database, clock: Clock, authenticator: RequestAuthenticator): ContractRouter['app'] {
  const service = new HomebrewPackService(
    {
      packs: new DrizzleHomebrewPackRepository(db),
      authors: new UserAuthorDirectory(db),
      enablement: new CampaignPackEnablementDirectory(db),
    },
    clock,
  );
  return homebrewRoutes(service, authenticator);
}
