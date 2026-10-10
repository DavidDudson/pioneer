import type { CampaignInviteService, CampaignService } from '@pioneer/campaign/application';
import { CampaignContract } from '@pioneer/campaign/domain';
import { ContractRouter } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';

/**
 * HTTP adapter: binds the campaign contract to the application services. Every route needs a
 * signed-in user (401 otherwise); which campaigns that user may see is the services' policy.
 */
export function campaignRoutes(
  service: CampaignService,
  invites: CampaignInviteService,
  auth: RequestAuthenticator,
): ContractRouter['app'] {
  return new ContractRouter('campaign-routes')
    .handleSignedIn(CampaignContract.list, auth, async ({ actor }) => [...(await service.list(actor))])
    .handleSignedIn(CampaignContract.join, auth, async ({ actor, body }) => invites.join(actor, body.token))
    .handleSignedIn(CampaignContract.get, auth, async ({ actor, params }) => service.get(actor, params.id))
    .handleSignedIn(CampaignContract.create, auth, async ({ actor, body }) => service.create(actor, body))
    .handleSignedIn(CampaignContract.roster, auth, async ({ actor, params }) => service.roster(actor, params.id))
    .handleSignedIn(CampaignContract.invites, auth, async ({ actor, params }) => [
      ...(await invites.list(actor, params.id)),
    ])
    .handleSignedIn(CampaignContract.createInvite, auth, async ({ actor, params }) => invites.create(actor, params.id))
    .handleSignedIn(CampaignContract.revokeInvite, auth, async ({ actor, params }) =>
      invites.revoke(actor, params.id, params.inviteId),
    ).app;
}
