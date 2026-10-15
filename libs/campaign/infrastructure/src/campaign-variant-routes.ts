import type { CampaignVariantService } from '@pioneer/campaign/application';
import { CampaignContract } from '@pioneer/campaign/domain';
import { ContractRouter } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';

/**
 * HTTP adapter for the variant rules a campaign uses. Every route needs a signed-in user (401 otherwise); who may read
 * or change the list is the service's policy.
 */
export function campaignVariantRoutes(
  service: CampaignVariantService,
  auth: RequestAuthenticator,
): ContractRouter['app'] {
  return new ContractRouter('campaign-variant-routes')
    .handleSignedIn(CampaignContract.variantRules, auth, async ({ actor, params }) =>
      service.variantRules(actor, params.id),
    )
    .handleSignedIn(CampaignContract.enableVariantRule, auth, async ({ actor, params, body }) =>
      service.enable(actor, params.id, body),
    )
    .handleSignedIn(CampaignContract.disableVariantRule, auth, async ({ actor, params }) =>
      service.disable(actor, params.id, params.variantId),
    ).app;
}
