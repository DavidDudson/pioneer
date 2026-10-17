import type { CampaignRuleLimitService } from '@pioneer/campaign/application';
import { CampaignContract } from '@pioneer/campaign/domain';
import { ContractRouter } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';

/**
 * HTTP adapter for a campaign's table limits. Every route needs a signed-in user (401 otherwise); who may read or
 * change them is the service's policy.
 */
export function campaignRuleLimitRoutes(
  service: CampaignRuleLimitService,
  auth: RequestAuthenticator,
): ContractRouter['app'] {
  return new ContractRouter('campaign-rule-limit-routes')
    .handleSignedIn(CampaignContract.ruleLimits, auth, async ({ actor, params }) =>
      service.ruleLimits(actor, params.id),
    )
    .handleSignedIn(CampaignContract.setRuleLimit, auth, async ({ actor, params, body }) =>
      service.set(actor, params.id, { limit: params.limit, value: body.value }),
    )
    .handleSignedIn(CampaignContract.resetRuleLimit, auth, async ({ actor, params }) =>
      service.reset(actor, params.id, params.limit),
    ).app;
}
