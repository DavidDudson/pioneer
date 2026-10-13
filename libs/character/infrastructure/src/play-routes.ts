import type { PlayService } from '@pioneer/character/application';
import { CharacterContract } from '@pioneer/character/domain';
import { ContractRouter } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';

/** HTTP adapter for a character's play state (#343). Every route needs a signed-in user (401 otherwise). */
export function playRoutes(service: PlayService, auth: RequestAuthenticator): ContractRouter['app'] {
  return new ContractRouter('play-routes')
    .handleSignedIn(CharacterContract.play, auth, async ({ actor, params }) => service.get(actor, params.id))
    .handleSignedIn(CharacterContract.patchPlay, auth, async ({ actor, params, body }) =>
      service.patch(actor, params.id, body),
    ).app;
}
