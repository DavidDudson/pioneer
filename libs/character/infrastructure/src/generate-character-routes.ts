import type { GenerateCharacterService } from '@pioneer/character/application';
import { CharacterContract } from '@pioneer/character/domain';
import { ContractRouter } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';

/** HTTP adapter for making a character at random. It needs a signed-in user (401 otherwise) and owns what it makes. */
export function generateCharacterRoutes(
  service: GenerateCharacterService,
  auth: RequestAuthenticator,
): ContractRouter['app'] {
  return new ContractRouter('generate-character-routes').handleSignedIn(
    CharacterContract.generate,
    auth,
    async ({ actor, body }) => service.generate(actor, body),
  ).app;
}
