import { CampaignService } from '@pioneer/campaign/application';
import { campaignRoutes, DrizzleCampaignRepository } from '@pioneer/campaign/infrastructure';
import type { Clock } from '@pioneer/shared/kernel';
import type { ContractRouter, RequestAuthenticator } from '@pioneer/shared/server';

import type { Database } from './database';

/** The campaign context's part of the composition root: service and routes. */
export function campaigns(db: Database, clock: Clock, authenticator: RequestAuthenticator): ContractRouter['app'] {
  const service = new CampaignService(new DrizzleCampaignRepository(db), clock);
  return campaignRoutes(service, authenticator);
}
