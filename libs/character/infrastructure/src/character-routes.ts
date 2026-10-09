import type { CharacterService } from '@pioneer/character/application';
import { CharacterContract } from '@pioneer/character/domain';
import { ContractRouter } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';

/**
 * HTTP adapter: binds the character contract to the application service. Every route needs a
 * signed-in user (401 otherwise); what that user may see is the service's policy.
 */
export function characterRoutes(service: CharacterService, auth: RequestAuthenticator): ContractRouter['app'] {
  return new ContractRouter('character-routes')
    .handleSignedIn(CharacterContract.list, auth, async ({ actor, query }) => [...(await service.list(actor, query))])
    .handleSignedIn(CharacterContract.get, auth, async ({ actor, params }) => service.get(actor, params.id))
    .handleSignedIn(CharacterContract.create, auth, async ({ actor, body }) => service.create(actor, body))
    .handleSignedIn(CharacterContract.patch, auth, async ({ actor, params, body }) =>
      service.patch(actor, params.id, body),
    ).app;
}
