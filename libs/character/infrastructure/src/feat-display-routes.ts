import type { FeatDisplayService } from '@pioneer/character/application';
import { CharacterContract } from '@pioneer/character/domain';
import { ContractRouter } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';

/**
 * HTTP adapter for the sections where the signed-in user shows a character's grant-only feats. Each request reads or
 * sets the caller's own; who may see the character is the service's policy.
 */
export function featDisplayRoutes(service: FeatDisplayService, auth: RequestAuthenticator): ContractRouter['app'] {
  return new ContractRouter('feat-display-routes')
    .handleSignedIn(CharacterContract.featDisplay, auth, async ({ actor, params }) => service.get(actor, params.id))
    .handleSignedIn(CharacterContract.setFeatDisplay, auth, async ({ actor, params, body }) =>
      service.set(actor, params.id, body),
    ).app;
}
