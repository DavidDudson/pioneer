import type { CampaignItemTransferService } from '@pioneer/campaign/application';
import { CampaignContract } from '@pioneer/campaign/domain';
import { ContractRouter } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';

/**
 * HTTP adapter for item and coin transfers between a campaign's characters. Every route needs a signed-in user (401 otherwise);
 * who may offer or answer is the service's policy.
 */
export function campaignItemTransferRoutes(
  service: CampaignItemTransferService,
  auth: RequestAuthenticator,
): ContractRouter['app'] {
  return new ContractRouter('campaign-item-transfer-routes')
    .handleSignedIn(CampaignContract.offerItem, auth, async ({ actor, params, body }) =>
      service.offer(actor, params.id, body),
    )
    .handleSignedIn(CampaignContract.offerCoins, auth, async ({ actor, params, body }) =>
      service.offerCoins(actor, params.id, body),
    )
    .handleSignedIn(CampaignContract.acceptTransfer, auth, async ({ actor, params }) =>
      service.accept(actor, params.id, params.transferId),
    )
    .handleSignedIn(CampaignContract.declineTransfer, auth, async ({ actor, params }) =>
      service.decline(actor, params.id, params.transferId),
    ).app;
}
