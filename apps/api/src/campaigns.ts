import { CampaignInviteService, CampaignService } from '@pioneer/campaign/application';
import {
  campaignRoutes,
  DrizzleCampaignInviteRepository,
  DrizzleCampaignRepository,
} from '@pioneer/campaign/infrastructure';
import type { Clock } from '@pioneer/shared/kernel';
import type { ContractRouter, RequestAuthenticator } from '@pioneer/shared/server';

import type { Database } from './database';
import { UserMemberDirectory } from './user-member-directory';

/** The campaign context's part of the composition root: services and routes. */
export function campaigns(db: Database, clock: Clock, authenticator: RequestAuthenticator): ContractRouter['app'] {
  const repository = new DrizzleCampaignRepository(db);
  const inviteRepository = new DrizzleCampaignInviteRepository(db);
  const service = new CampaignService(
    { campaigns: repository, invites: inviteRepository, directory: new UserMemberDirectory(db) },
    clock,
  );
  const invites = new CampaignInviteService(repository, inviteRepository, clock);
  return campaignRoutes(service, invites, authenticator);
}
