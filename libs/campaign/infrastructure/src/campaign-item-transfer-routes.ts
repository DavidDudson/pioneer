import type { CampaignItemTransferService } from '@pioneer/campaign/application';
import { CampaignContract } from '@pioneer/campaign/domain';
import { ContractRouter } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';

/**
 * HTTP adapter for item transfers between a campaign's characters. Every route needs a signed-in user (401 otherwise);
 * who may offer is the service's policy.
 */
export function campaignItemTransferRoutes(
  service: CampaignItemTransferService,
  auth: RequestAuthenticator,
): ContractRouter['app'] {
  return new ContractRouter('campaign-item-transfer-routes').handleSignedIn(
    CampaignContract.offerItem,
    auth,
    async ({ actor, params, body }) => service.offer(actor, params.id, body),
  ).app;
}
