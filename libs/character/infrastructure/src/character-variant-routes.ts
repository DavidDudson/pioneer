import type { CharacterVariantService } from '@pioneer/character/application';
import { CharacterContract } from '@pioneer/character/domain';
import { ContractRouter } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';

/**
 * HTTP adapter for the variant rules a character uses. Every route needs a signed-in user (401 otherwise); who may read
 * or change the list is the service's policy.
 */
export function characterVariantRoutes(
  service: CharacterVariantService,
  auth: RequestAuthenticator,
): ContractRouter['app'] {
  return new ContractRouter('character-variant-routes')
    .handleSignedIn(CharacterContract.variantRules, auth, async ({ actor, params }) =>
      service.variantRules(actor, params.id),
    )
    .handleSignedIn(CharacterContract.enableVariantRule, auth, async ({ actor, params, body }) =>
      service.enable(actor, params.id, body),
    )
    .handleSignedIn(CharacterContract.disableVariantRule, auth, async ({ actor, params }) =>
      service.disable(actor, params.id, params.variantId),
    ).app;
}
