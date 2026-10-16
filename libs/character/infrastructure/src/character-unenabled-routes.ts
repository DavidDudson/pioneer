import type { CharacterUnenabledService } from '@pioneer/character/application';
import { CharacterContract } from '@pioneer/character/domain';
import { ContractRouter } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';

/** HTTP adapter for what a character uses that its campaign has not enabled. Needs a signed-in user (401 otherwise). */
export function characterUnenabledRoutes(
  service: CharacterUnenabledService,
  auth: RequestAuthenticator,
): ContractRouter['app'] {
  return new ContractRouter('character-unenabled-routes').handleSignedIn(
    CharacterContract.unenabledContent,
    auth,
    async ({ actor, params }) => service.unenabled(actor, params.id),
  ).app;
}
