import type { CharacterItemApprovalService } from '@pioneer/character/application';
import { CharacterContract } from '@pioneer/character/domain';
import { ContractRouter } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';

/**
 * HTTP adapter for the rule-breaking lines that no longer warn: a campaign's approvals, and the acknowledgements of a
 * character outside one. Every route needs a signed-in user (401 otherwise); only the owner reads or changes them.
 */
export function characterItemApprovalRoutes(
  service: CharacterItemApprovalService,
  auth: RequestAuthenticator,
): ContractRouter['app'] {
  return new ContractRouter('character-item-approval-routes')
    .handleSignedIn(CharacterContract.itemApprovals, auth, async ({ actor, params }) =>
      service.itemApprovals(actor, params.id),
    )
    .handleSignedIn(CharacterContract.acknowledgeItem, auth, async ({ actor, params, body }) =>
      service.acknowledge(actor, params.id, body),
    )
    .handleSignedIn(CharacterContract.revokeItemAcknowledgement, auth, async ({ actor, params }) =>
      service.revoke(actor, params.id, params.acknowledgementId),
    ).app;
}
