import type { CampaignItemApprovalService } from '@pioneer/campaign/application';
import { CampaignContract } from '@pioneer/campaign/domain';
import { ContractRouter } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';

/**
 * HTTP adapter for a campaign's rule-breaking items. Every route needs a signed-in user (401 otherwise); who may read
 * or change them is the service's policy.
 */
export function campaignItemApprovalRoutes(
  service: CampaignItemApprovalService,
  auth: RequestAuthenticator,
): ContractRouter['app'] {
  return new ContractRouter('campaign-item-approval-routes')
    .handleSignedIn(CampaignContract.itemReview, auth, async ({ actor, params }) =>
      service.itemReview(actor, params.id),
    )
    .handleSignedIn(CampaignContract.approveItem, auth, async ({ actor, params, body }) =>
      service.approve(actor, params.id, body),
    )
    .handleSignedIn(CampaignContract.revokeItemApproval, auth, async ({ actor, params }) =>
      service.revoke(actor, params.id, params.approvalId),
    ).app;
}
