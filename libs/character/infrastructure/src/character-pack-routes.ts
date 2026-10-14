import type { CharacterPackService } from '@pioneer/character/application';
import { CharacterContract } from '@pioneer/character/domain';
import { ContractRouter } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';

/**
 * HTTP adapter for the packs a character uses. Every route needs a signed-in user (401 otherwise); who may read or
 * change the list is the service's policy.
 */
export function characterPackRoutes(service: CharacterPackService, auth: RequestAuthenticator): ContractRouter['app'] {
  return new ContractRouter('character-pack-routes')
    .handleSignedIn(CharacterContract.packs, auth, async ({ actor, params }) => service.packs(actor, params.id))
    .handleSignedIn(CharacterContract.enablePack, auth, async ({ actor, params, body }) =>
      service.enable(actor, params.id, body),
    )
    .handleSignedIn(CharacterContract.disablePack, auth, async ({ actor, params }) =>
      service.disable(actor, params.id, params.packId),
    ).app;
}
