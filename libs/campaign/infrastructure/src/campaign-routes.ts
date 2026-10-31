import type {
  CampaignInviteService,
  CampaignItemApprovalService,
  CampaignItemTransferService,
  CampaignKeyItemService,
  CampaignPackService,
  CampaignPartyService,
  CampaignRuleLimitService,
  CampaignService,
  CampaignVariantService,
} from '@pioneer/campaign/application';
import { CampaignContract } from '@pioneer/campaign/domain';
import { ContractRouter } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';

import { campaignItemApprovalRoutes } from './campaign-item-approval-routes';
import { campaignItemTransferRoutes } from './campaign-item-transfer-routes';
import { campaignKeyItemRoutes } from './campaign-key-item-routes';
import { campaignRuleLimitRoutes } from './campaign-rule-limit-routes';
import { campaignVariantRoutes } from './campaign-variant-routes';

/** The services behind the routes for the items a campaign's characters hold, offer and are given. */
interface ItemServices {
  readonly itemApprovals: CampaignItemApprovalService;
  readonly keyItems: CampaignKeyItemService;
  readonly itemTransfers: CampaignItemTransferService;
}

/** The application services the campaign routes call. */
export interface CampaignServices extends ItemServices {
  readonly campaigns: CampaignService;
  readonly invites: CampaignInviteService;
  readonly party: CampaignPartyService;
  readonly packs: CampaignPackService;
  readonly variants: CampaignVariantService;
  readonly ruleLimits: CampaignRuleLimitService;
}

/** The routes for approving rule-breaking items, key items and item transfers. */
function campaignItemRoutes(
  { itemApprovals, keyItems, itemTransfers }: ItemServices,
  auth: RequestAuthenticator,
): ContractRouter['app'] {
  return campaignItemApprovalRoutes(itemApprovals, auth)
    .use(campaignKeyItemRoutes(keyItems, auth))
    .use(campaignItemTransferRoutes(itemTransfers, auth));
}

/**
 * HTTP adapter: binds the campaign contract to the application services. Every route needs a
 * signed-in user (401 otherwise); which campaigns that user may see is the services' policy.
 */
export function campaignRoutes(
  { campaigns: service, invites, party, packs, variants, ruleLimits, ...items }: CampaignServices,
  auth: RequestAuthenticator,
): ContractRouter['app'] {
  return new ContractRouter('campaign-routes')
    .handleSignedIn(CampaignContract.list, auth, async ({ actor }) => [...(await service.list(actor))])
    .handleSignedIn(CampaignContract.archived, auth, async ({ actor }) => [...(await service.listArchived(actor))])
    .handleSignedIn(CampaignContract.join, auth, async ({ actor, body }) => invites.join(actor, body.token))
    .handleSignedIn(CampaignContract.get, auth, async ({ actor, params }) => service.get(actor, params.id))
    .handleSignedIn(CampaignContract.create, auth, async ({ actor, body }) => service.create(actor, body))
    .handleSignedIn(CampaignContract.archive, auth, async ({ actor, params }) => service.archive(actor, params.id))
    .handleSignedIn(CampaignContract.restore, auth, async ({ actor, params }) => service.restore(actor, params.id))
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
    .handleSignedIn(CampaignContract.packs, auth, async ({ actor, params }) => packs.packs(actor, params.id))
    .handleSignedIn(CampaignContract.enablePack, auth, async ({ actor, params, body }) =>
      packs.enable(actor, params.id, body),
    )
    .handleSignedIn(CampaignContract.disablePack, auth, async ({ actor, params }) =>
      packs.disable(actor, params.id, params.packId),
    )
    .handleSignedIn(CampaignContract.invites, auth, async ({ actor, params }) => [
      ...(await invites.list(actor, params.id)),
    ])
    .handleSignedIn(CampaignContract.createInvite, auth, async ({ actor, params }) => invites.create(actor, params.id))
    .handleSignedIn(CampaignContract.revokeInvite, auth, async ({ actor, params }) =>
      invites.revoke(actor, params.id, params.inviteId),
    )
    .app.use(campaignVariantRoutes(variants, auth))
    .use(campaignRuleLimitRoutes(ruleLimits, auth))
    .use(campaignItemRoutes(items, auth));
}
