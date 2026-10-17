import type { CampaignKeyItemService } from '@pioneer/campaign/application';
import { CampaignContract } from '@pioneer/campaign/domain';
import { ContractRouter } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';

/**
 * HTTP adapter for a campaign's key items. Every route needs a signed-in user (401 otherwise); who may read or change
 * them is the service's policy.
 */
export function campaignKeyItemRoutes(
  service: CampaignKeyItemService,
  auth: RequestAuthenticator,
): ContractRouter['app'] {
  return new ContractRouter('campaign-key-item-routes')
    .handleSignedIn(CampaignContract.keyItems, auth, async ({ actor, params }) => service.list(actor, params.id))
    .handleSignedIn(CampaignContract.createKeyItem, auth, async ({ actor, params, body }) =>
      service.create(actor, params.id, body),
    )
    .handleSignedIn(CampaignContract.giveKeyItem, auth, async ({ actor, params, body }) =>
      service.give(actor, params, body),
    )
    .handleSignedIn(CampaignContract.takeBackKeyItem, auth, async ({ actor, params }) =>
      service.takeBack(actor, params),
    )
    .handleSignedIn(CampaignContract.archiveKeyItem, auth, async ({ actor, params }) => service.archive(actor, params))
    .app;
}
