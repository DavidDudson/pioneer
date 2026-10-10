import type { CampaignInviteService, CampaignPartyService, CampaignService } from '@pioneer/campaign/application';
import { CampaignContract } from '@pioneer/campaign/domain';
import { ContractRouter } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';

/** The application services the campaign routes call. */
export interface CampaignServices {
  readonly campaigns: CampaignService;
  readonly invites: CampaignInviteService;
  readonly party: CampaignPartyService;
}

/**
 * HTTP adapter: binds the campaign contract to the application services. Every route needs a
 * signed-in user (401 otherwise); which campaigns that user may see is the services' policy.
 */
export function campaignRoutes(
  { campaigns: service, invites, party }: CampaignServices,
  auth: RequestAuthenticator,
): ContractRouter['app'] {
  return new ContractRouter('campaign-routes')
    .handleSignedIn(CampaignContract.list, auth, async ({ actor }) => [...(await service.list(actor))])
    .handleSignedIn(CampaignContract.join, auth, async ({ actor, body }) => invites.join(actor, body.token))
    .handleSignedIn(CampaignContract.get, auth, async ({ actor, params }) => service.get(actor, params.id))
    .handleSignedIn(CampaignContract.create, auth, async ({ actor, body }) => service.create(actor, body))
    .handleSignedIn(CampaignContract.roster, auth, async ({ actor, params }) => service.roster(actor, params.id))
    .handleSignedIn(CampaignContract.removeMember, auth, async ({ actor, params }) =>
      service.removeMember(actor, params.id, params.memberId),
    )
    .handleSignedIn(CampaignContract.transferGm, auth, async ({ actor, params, body }) =>
      service.transferGm(actor, params.id, body),
    )
    .handleSignedIn(CampaignContract.leave, auth, async ({ actor, params }) => {
      await service.leave(actor, params.id);
      return {};
    })
    .handleSignedIn(CampaignContract.party, auth, async ({ actor, params }) => party.party(actor, params.id))
    .handleSignedIn(CampaignContract.attachCharacter, auth, async ({ actor, params, body }) =>
      party.attach(actor, params.id, body),
    )
    .handleSignedIn(CampaignContract.detachCharacter, auth, async ({ actor, params }) =>
      party.detach(actor, params.id, params.characterId),
    )
    .handleSignedIn(CampaignContract.invites, auth, async ({ actor, params }) => [
      ...(await invites.list(actor, params.id)),
    ])
    .handleSignedIn(CampaignContract.createInvite, auth, async ({ actor, params }) => invites.create(actor, params.id))
    .handleSignedIn(CampaignContract.revokeInvite, auth, async ({ actor, params }) =>
      invites.revoke(actor, params.id, params.inviteId),
    ).app;
}
