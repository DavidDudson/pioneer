import {
  CampaignInviteService,
  CampaignPackService,
  CampaignPartyService,
  CampaignService,
} from '@pioneer/campaign/application';
import {
  campaignRoutes,
  DrizzleCampaignInviteRepository,
  DrizzleCampaignPackRepository,
  DrizzleCampaignPartyRepository,
  DrizzleCampaignRepository,
} from '@pioneer/campaign/infrastructure';
import { PackAccessPolicy } from '@pioneer/homebrew/application';
import { DrizzlePackDependencyRepository, DrizzlePackDirectory } from '@pioneer/homebrew/infrastructure';
import type { Clock } from '@pioneer/shared/kernel';
import type { ContractRouter, RequestAuthenticator } from '@pioneer/shared/server';

import { CampaignPackEnablementDirectory } from './campaign-pack-enablement-directory';
import type { Database } from './database';
import { HomebrewPackCatalog } from './homebrew-pack-catalog';
import { OwnedCharacterDirectory } from './owned-character-directory';
import { UserMemberDirectory } from './user-member-directory';

/** The campaign context's part of the composition root: services and routes. */
export function campaigns(db: Database, clock: Clock, authenticator: RequestAuthenticator): ContractRouter['app'] {
  const repository = new DrizzleCampaignRepository(db);
  const inviteRepository = new DrizzleCampaignInviteRepository(db);
  const directory = new UserMemberDirectory(db);
  const service = new CampaignService({ campaigns: repository, invites: inviteRepository, directory }, clock);
  const invites = new CampaignInviteService(repository, inviteRepository, clock);
  const party = new CampaignPartyService(
    {
      campaigns: repository,
      party: new DrizzleCampaignPartyRepository(db),
      characters: new OwnedCharacterDirectory(db),
      directory,
    },
    clock,
  );
  const access = new PackAccessPolicy(new CampaignPackEnablementDirectory(db));
  const catalog = new HomebrewPackCatalog(
    new DrizzlePackDirectory(db),
    new DrizzlePackDependencyRepository(db),
    access,
  );
  const packs = new CampaignPackService(
    { campaigns: repository, packs: new DrizzleCampaignPackRepository(db), catalog },
    clock,
  );
  return campaignRoutes({ campaigns: service, invites, party, packs }, authenticator);
}
