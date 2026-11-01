import type { CampaignPartyStashService } from '@pioneer/campaign/application';
import { CampaignContract } from '@pioneer/campaign/domain';
import { ContractRouter } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';

/**
 * HTTP adapter for the party stash. Every route needs a signed-in user (401 otherwise); who may read it, put lines in
 * and take them out is the service's policy.
 */
export function campaignPartyStashRoutes(
  service: CampaignPartyStashService,
  auth: RequestAuthenticator,
): ContractRouter['app'] {
  return new ContractRouter('campaign-party-stash-routes')
    .handleSignedIn(CampaignContract.partyStash, auth, async ({ actor, params }) => service.view(actor, params.id))
    .handleSignedIn(CampaignContract.depositToPartyStash, auth, async ({ actor, params, body }) =>
      service.deposit(actor, params.id, body),
    )
    .handleSignedIn(CampaignContract.takeFromPartyStash, auth, async ({ actor, params, body }) =>
      service.take(actor, params.id, body),
    ).app;
}
